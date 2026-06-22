import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File as FSFile } from 'expo-file-system';
import {
  Article, CaretDown, CaretUp, Check, ListChecks, Paperclip,
  Play, Plus, Trash, VideoCamera, X,
} from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
import { RichField } from '@/components/tutor/rich-field';
import { presignUpload, uploadFileToS3 } from '@/lib/api/tutor-upload';
import { shared } from './shared';
import { LESSON_TYPES } from './constants';
import type { CourseForm, FormLesson, LessonType, QuizQuestion, QuizQuestionType } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function makeDefaultQuestion(): QuizQuestion {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    questionType: 'mcq',
    question: '',
    options: ['', ''],
    correctAnswer: 0,
    correctAnswers: [],
    shortAnswer: '',
    explanation: '',
  };
}

export function makeDefaultLesson(order: number, isFreePreview = false): FormLesson {
  return {
    title: '', type: 'VIDEO', content: '', duration: 0,
    isFreePreview, order, videoUri: null, quizQuestions: [],
    assignmentDelivery: 'text', assignmentFileUri: null,
    assignmentFileName: null, resourceFileUri: null, resourceFileName: null,
  };
}

// ─── Lesson type icon ─────────────────────────────────────────────────────────

const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'true-false', label: 'True / False' },
  { value: 'multiple-select', label: 'Multi-Select' },
  { value: 'short-answer', label: 'Short Answer' },
];

function LessonTypeIcon({ type, color, size = 14 }: { type: LessonType; color: string; size?: number }) {
  const props = { size, color, weight: 'regular' as const };
  switch (type) {
    case 'VIDEO': return <VideoCamera {...props} />;
    case 'ARTICLE': return <Article {...props} />;
    case 'QUIZ': return <ListChecks {...props} />;
    default: return <Paperclip {...props} />;
  }
}

// ─── Quiz question editor ─────────────────────────────────────────────────────

function QuizQuestionEditor({
  question, index, onUpdate, onDelete, theme,
}: {
  question: QuizQuestion;
  index: number;
  onUpdate: (u: Partial<QuizQuestion>) => void;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  function setOption(oi: number, val: string) {
    const options = [...question.options];
    options[oi] = val;
    onUpdate({ options });
  }

  function addOption() {
    if (question.options.length >= 6) return;
    onUpdate({ options: [...question.options, ''] });
  }

  function removeOption(oi: number) {
    if (question.options.length <= 2) return;
    const options = question.options.filter((_, i) => i !== oi);
    onUpdate({
      options,
      correctAnswer: question.correctAnswer >= oi ? Math.max(0, question.correctAnswer - 1) : question.correctAnswer,
      correctAnswers: question.correctAnswers.filter(ca => ca !== oi).map(ca => ca > oi ? ca - 1 : ca),
    });
  }

  function changeType(type: QuizQuestionType) {
    const base: Partial<QuizQuestion> = { questionType: type };
    if (type === 'true-false') {
      base.options = ['True', 'False'];
      base.correctAnswer = 0;
      base.correctAnswers = [];
    } else if (type === 'mcq') {
      base.options = question.options.length >= 2 ? question.options : ['', ''];
      base.correctAnswers = [];
    } else if (type === 'multiple-select') {
      base.options = question.options.length >= 2 ? question.options : ['', ''];
      base.correctAnswer = 0;
    } else {
      base.options = [];
      base.correctAnswer = 0;
      base.correctAnswers = [];
    }
    onUpdate(base);
  }

  return (
    <View style={[curr.qCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
      <View style={curr.qHeader}>
        <View style={[curr.qNum, { backgroundColor: theme.primary }]}>
          <Text style={curr.qNumText}>{index + 1}</Text>
        </View>
        <Text style={[curr.qLabel, { color: theme.textSecondary }]}>Question {index + 1}</Text>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Trash size={15} color={theme.error} weight="regular" />
        </Pressable>
      </View>

      <View style={shared.chipWrap}>
        {QUESTION_TYPES.map((qt) => {
          const sel = question.questionType === qt.value;
          return (
            <Pressable key={qt.value} onPress={() => changeType(qt.value)}
              style={[shared.chip, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}>
              <Text style={[shared.chipText, { color: sel ? theme.primary : theme.textSecondary }]}>{qt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={[curr.qInput, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
        value={question.question}
        onChangeText={(v) => onUpdate({ question: v })}
        placeholder="Question text…"
        placeholderTextColor={theme.textSecondary}
        multiline
      />

      {question.questionType === 'short-answer' ? (
        <View style={{ gap: 6 }}>
          <Text style={[curr.optLabel, { color: theme.textSecondary }]}>Expected Answer</Text>
          <TextInput
            style={[curr.qInput, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
            value={question.shortAnswer}
            onChangeText={(v) => onUpdate({ shortAnswer: v })}
            placeholder="Model answer…"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={[curr.optLabel, { color: theme.textSecondary }]}>
            {question.questionType === 'multiple-select' ? 'Options — tap all correct answers' : 'Options — tap to mark correct'}
          </Text>
          {question.options.map((opt, oi) => {
            const isCorrect = question.questionType === 'multiple-select'
              ? question.correctAnswers.includes(oi)
              : question.correctAnswer === oi;

            function toggleCorrect() {
              if (question.questionType === 'multiple-select') {
                const ca = isCorrect
                  ? question.correctAnswers.filter(x => x !== oi)
                  : [...question.correctAnswers, oi];
                onUpdate({ correctAnswers: ca });
              } else {
                onUpdate({ correctAnswer: oi });
              }
            }

            return (
              <View key={oi} style={curr.optRow}>
                <Pressable onPress={toggleCorrect}
                  style={[curr.optCheck, { borderColor: isCorrect ? theme.primary : theme.border, backgroundColor: isCorrect ? theme.primary : 'transparent' }]}>
                  {isCorrect && <Check size={10} color="#fff" weight="bold" />}
                </Pressable>
                {question.questionType === 'true-false' ? (
                  <Text style={[curr.optText, { color: theme.text }]}>{opt}</Text>
                ) : (
                  <TextInput
                    style={[curr.optInput, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
                    value={opt}
                    onChangeText={(v) => setOption(oi, v)}
                    placeholder={`Option ${oi + 1}…`}
                    placeholderTextColor={theme.textSecondary}
                  />
                )}
                {question.questionType !== 'true-false' && question.options.length > 2 && (
                  <Pressable onPress={() => removeOption(oi)} hitSlop={8}>
                    <X size={14} color={theme.textSecondary} weight="regular" />
                  </Pressable>
                )}
              </View>
            );
          })}
          {question.questionType !== 'true-false' && question.options.length < 6 && (
            <Pressable onPress={addOption} style={[curr.addOptBtn, { borderColor: theme.border }]}>
              <Plus size={13} color={theme.primary} weight="regular" />
              <Text style={[curr.addOptText, { color: theme.primary }]}>Add option</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={{ gap: 6 }}>
        <Text style={[curr.optLabel, { color: theme.textSecondary }]}>Explanation (optional)</Text>
        <TextInput
          style={[curr.qInput, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }]}
          value={question.explanation}
          onChangeText={(v) => onUpdate({ explanation: v })}
          placeholder="Why is this the correct answer?…"
          placeholderTextColor={theme.textSecondary}
          multiline
        />
      </View>
    </View>
  );
}

// ─── Lesson editor ────────────────────────────────────────────────────────────

function LessonEditor({
  lesson, onUpdate, onDelete, theme,
}: {
  lesson: FormLesson;
  onUpdate: (u: Partial<FormLesson>) => void;
  onDelete: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  async function pickVideo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access to upload video.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'videos', allowsEditing: false });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const durationSec = asset.duration ? Math.round(asset.duration / 1000) : 0;
    onUpdate({ videoUri: asset.uri, content: '', duration: durationSec });
    setUploading(true); setUploadPct(0);
    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'mp4';
      const mime = asset.mimeType ?? `video/${ext}`;
      const fsFile = new FSFile(asset.uri);
      const size = fsFile.size ?? asset.fileSize ?? 0;
      const { uploadUrl, key } = await presignUpload('lesson-video', `lesson-video.${ext}`, mime, size);
      await uploadFileToS3(uploadUrl, asset.uri, mime, setUploadPct);
      onUpdate({ content: key });
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not upload video');
      onUpdate({ videoUri: null, content: '' });
    } finally { setUploading(false); }
  }

  async function pickDocument(
    folder: 'assignment' | 'resource',
    uriKey: 'assignmentFileUri' | 'resourceFileUri',
    nameKey: 'assignmentFileName' | 'resourceFileName',
  ) {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    onUpdate({ [uriKey]: asset.uri, [nameKey]: asset.name, content: '' } as Partial<FormLesson>);
    setUploading(true); setUploadPct(0);
    try {
      const mime = asset.mimeType ?? 'application/octet-stream';
      const size = asset.size ?? 0;
      const { uploadUrl, key } = await presignUpload(folder, asset.name, mime, size);
      await uploadFileToS3(uploadUrl, asset.uri, mime, setUploadPct);
      onUpdate({ content: key } as Partial<FormLesson>);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not upload file');
      onUpdate({ [uriKey]: null, [nameKey]: null, content: '' } as Partial<FormLesson>);
    } finally { setUploading(false); }
  }

  function changeType(type: LessonType) {
    onUpdate({
      type, content: '', videoUri: null,
      quizQuestions: type === 'QUIZ' ? [makeDefaultQuestion()] : lesson.quizQuestions,
      assignmentDelivery: 'text', assignmentFileUri: null, assignmentFileName: null,
      resourceFileUri: null, resourceFileName: null,
    });
  }

  const durationMin = lesson.duration ? Math.floor(lesson.duration / 60) : 0;
  const durationSec = lesson.duration ? lesson.duration % 60 : 0;
  const durationDisplay = lesson.duration ? `${durationMin}:${String(durationSec).padStart(2, '0')}` : '';

  return (
    <View style={[curr.lessonCard, { borderColor: expanded ? theme.primary : theme.border, backgroundColor: theme.surface }]}>
      <Pressable onPress={() => setExpanded(!expanded)} style={curr.lessonHeader}>
        <LessonTypeIcon type={lesson.type} color={expanded ? theme.primary : theme.textSecondary} size={16} />
        <Text style={[curr.lessonHeaderTitle, { color: lesson.title ? theme.text : theme.textSecondary }]} numberOfLines={1}>
          {lesson.title || 'Untitled lesson'}
        </Text>
        <Pressable onPress={onDelete} hitSlop={10} style={{ padding: 4 }}>
          <Trash size={14} color={theme.error} weight="regular" />
        </Pressable>
        {expanded ? <CaretUp size={14} color={theme.textSecondary} /> : <CaretDown size={14} color={theme.textSecondary} />}
      </Pressable>

      {expanded && (
        <View style={[curr.lessonBody, { borderTopColor: theme.border }]}>
          <TextInput
            style={[curr.lessonTitleInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
            value={lesson.title}
            onChangeText={(v) => onUpdate({ title: v })}
            placeholder="Lesson title…"
            placeholderTextColor={theme.textSecondary}
          />

          <View style={shared.chipWrap}>
            {LESSON_TYPES.map((lt) => {
              const sel = lesson.type === lt.value;
              return (
                <Pressable key={lt.value} onPress={() => changeType(lt.value)}
                  style={[shared.chip, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}>
                  <Text style={[shared.chipText, { color: sel ? theme.primary : theme.textSecondary }]}>{lt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {lesson.type === 'VIDEO' && (
            <Pressable onPress={pickVideo} disabled={uploading}
              style={[curr.mediaBox, { borderColor: lesson.videoUri ? theme.primary : theme.border, backgroundColor: theme.background }]}>
              {lesson.videoUri ? (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Play size={30} color={lesson.content ? theme.primary : theme.textSecondary} weight="fill" />
                  <Text style={[curr.mediaFileName, { color: theme.text }]} numberOfLines={1}>
                    {lesson.videoUri.split('/').pop()}
                  </Text>
                  {uploading
                    ? <Text style={[curr.mediaPct, { color: theme.primary }]}>Uploading… {uploadPct}%</Text>
                    : lesson.content
                      ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Check size={12} color="#2E7D32" weight="bold" />
                          <Text style={{ fontSize: 12, color: '#2E7D32', fontFamily: Fonts.semiBold }}>Uploaded</Text>
                        </View>
                      : null}
                  {!uploading && <Text style={[curr.mediaTapChange, { color: theme.textSecondary }]}>Tap to change</Text>}
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <VideoCamera size={32} color={theme.border} weight="regular" />
                  <Text style={[curr.mediaPrompt, { color: theme.textSecondary }]}>Tap to upload video</Text>
                  <Text style={[curr.mediaHint, { color: theme.textSecondary }]}>MP4 or MOV, max 1GB</Text>
                </View>
              )}
              {uploading && (
                <View style={curr.mediaOverlay}>
                  <ActivityIndicator color="#fff" />
                  <Text style={curr.mediaOverlayText}>{uploadPct}%</Text>
                </View>
              )}
            </Pressable>
          )}

          {lesson.type === 'ARTICLE' && (
            <RichField
              label="Article Content"
              value={lesson.content}
              onChangeText={(v) => onUpdate({ content: v })}
              placeholder="Write the article content here…"
              required
              minHeight={180}
              rte
              aiField="Article lesson content"
              courseTitle=""
            />
          )}

          {lesson.type === 'QUIZ' && (
            <View style={{ gap: 12 }}>
              {lesson.quizQuestions.length === 0 && (
                <Text style={[curr.emptyHint, { color: theme.textSecondary }]}>No questions yet. Add one below.</Text>
              )}
              {lesson.quizQuestions.map((q, qi) => (
                <QuizQuestionEditor
                  key={q.id}
                  question={q}
                  index={qi}
                  theme={theme}
                  onUpdate={(u) => {
                    const qs = [...lesson.quizQuestions];
                    qs[qi] = { ...qs[qi], ...u };
                    onUpdate({ quizQuestions: qs });
                  }}
                  onDelete={() => onUpdate({ quizQuestions: lesson.quizQuestions.filter((_, i) => i !== qi) })}
                />
              ))}
              <Pressable
                onPress={() => onUpdate({ quizQuestions: [...lesson.quizQuestions, makeDefaultQuestion()] })}
                style={[curr.addQuestionBtn, { borderColor: theme.border }]}
              >
                <Plus size={14} color={theme.primary} weight="regular" />
                <Text style={[curr.addQuestionText, { color: theme.primary }]}>Add Question</Text>
              </Pressable>
            </View>
          )}

          {lesson.type === 'ASSIGNMENT' && (
            <View style={{ gap: 12 }}>
              <View style={shared.chipWrap}>
                {[{ value: 'text', label: 'Text Instructions' }, { value: 'file', label: 'File Upload' }].map((d) => {
                  const sel = lesson.assignmentDelivery === d.value;
                  return (
                    <Pressable key={d.value}
                      onPress={() => onUpdate({ assignmentDelivery: d.value as 'text' | 'file', content: '', assignmentFileUri: null, assignmentFileName: null })}
                      style={[shared.chip, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.surface }]}>
                      <Text style={[shared.chipText, { color: sel ? theme.primary : theme.textSecondary }]}>{d.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {lesson.assignmentDelivery === 'text' ? (
                <RichField
                  label="Assignment Instructions"
                  value={lesson.content}
                  onChangeText={(v) => onUpdate({ content: v })}
                  placeholder="Describe what students need to do…"
                  required
                  minHeight={140}
                  rte
                  aiField="Assignment instructions"
                  courseTitle=""
                />
              ) : (
                <Pressable onPress={() => pickDocument('assignment', 'assignmentFileUri', 'assignmentFileName')} disabled={uploading}
                  style={[curr.mediaBox, { borderColor: lesson.assignmentFileUri ? theme.primary : theme.border, backgroundColor: theme.background }]}>
                  {lesson.assignmentFileUri ? (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Paperclip size={28} color={lesson.content ? theme.primary : theme.textSecondary} weight="regular" />
                      <Text style={[curr.mediaFileName, { color: theme.text }]} numberOfLines={1}>{lesson.assignmentFileName}</Text>
                      {uploading
                        ? <Text style={[curr.mediaPct, { color: theme.primary }]}>Uploading… {uploadPct}%</Text>
                        : lesson.content
                          ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Check size={12} color="#2E7D32" weight="bold" />
                              <Text style={{ fontSize: 12, color: '#2E7D32', fontFamily: Fonts.semiBold }}>Uploaded</Text>
                            </View>
                          : null}
                      {!uploading && <Text style={[curr.mediaTapChange, { color: theme.textSecondary }]}>Tap to change</Text>}
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', gap: 8 }}>
                      <Paperclip size={32} color={theme.border} weight="regular" />
                      <Text style={[curr.mediaPrompt, { color: theme.textSecondary }]}>Tap to upload file</Text>
                      <Text style={[curr.mediaHint, { color: theme.textSecondary }]}>PDF, DOC, ZIP up to 50MB</Text>
                    </View>
                  )}
                  {uploading && (
                    <View style={curr.mediaOverlay}>
                      <ActivityIndicator color="#fff" />
                      <Text style={curr.mediaOverlayText}>{uploadPct}%</Text>
                    </View>
                  )}
                </Pressable>
              )}
            </View>
          )}

          {lesson.type === 'RESOURCE' && (
            <Pressable onPress={() => pickDocument('resource', 'resourceFileUri', 'resourceFileName')} disabled={uploading}
              style={[curr.mediaBox, { borderColor: lesson.resourceFileUri ? theme.primary : theme.border, backgroundColor: theme.background }]}>
              {lesson.resourceFileUri ? (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Paperclip size={28} color={lesson.content ? theme.primary : theme.textSecondary} weight="regular" />
                  <Text style={[curr.mediaFileName, { color: theme.text }]} numberOfLines={1}>{lesson.resourceFileName}</Text>
                  {uploading
                    ? <Text style={[curr.mediaPct, { color: theme.primary }]}>Uploading… {uploadPct}%</Text>
                    : lesson.content
                      ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Check size={12} color="#2E7D32" weight="bold" />
                          <Text style={{ fontSize: 12, color: '#2E7D32', fontFamily: Fonts.semiBold }}>Uploaded</Text>
                        </View>
                      : null}
                  {!uploading && <Text style={[curr.mediaTapChange, { color: theme.textSecondary }]}>Tap to change</Text>}
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Paperclip size={32} color={theme.border} weight="regular" />
                  <Text style={[curr.mediaPrompt, { color: theme.textSecondary }]}>Tap to add resource file</Text>
                  <Text style={[curr.mediaHint, { color: theme.textSecondary }]}>PDF, DOC, ZIP up to 50MB</Text>
                </View>
              )}
              {uploading && (
                <View style={curr.mediaOverlay}>
                  <ActivityIndicator color="#fff" />
                  <Text style={curr.mediaOverlayText}>{uploadPct}%</Text>
                </View>
              )}
            </Pressable>
          )}

          {lesson.type !== 'RESOURCE' && (
            <View style={curr.durationRow}>
              <Text style={[curr.durationLabel, { color: theme.textSecondary }]}>
                {lesson.type === 'VIDEO' && lesson.duration > 0 ? 'Duration (auto-detected)' : 'Duration (minutes)'}
              </Text>
              {lesson.type === 'VIDEO' && lesson.duration > 0 ? (
                <Text style={[curr.durationValue, { color: theme.text }]}>{durationDisplay}</Text>
              ) : (
                <TextInput
                  style={[curr.durationInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
                  value={durationMin > 0 ? String(durationMin) : ''}
                  onChangeText={(v) => onUpdate({ duration: (parseFloat(v) || 0) * 60 })}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.textSecondary}
                />
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Step 5 ────────────────────────────────────────────────────────────────────

type Props = {
  form: CourseForm;
  update: (changes: Partial<CourseForm>) => void;
};

export function Step5({ form, update }: Props) {
  const theme = useTheme();
  const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');

  function updateLesson(si: number, li: number, changes: Partial<FormLesson>) {
    const sections = [...form.sections];
    const sec = { ...sections[si] };
    const lessons = [...sec.lessons];
    lessons[li] = { ...lessons[li], ...changes };
    sec.lessons = lessons;
    sections[si] = sec;
    update({ sections });
  }

  function addLesson(si: number) {
    const sections = [...form.sections];
    const sec = { ...sections[si] };
    sec.lessons = [...sec.lessons, makeDefaultLesson(sec.lessons.length, sec.lessons.length === 0)];
    sections[si] = sec;
    update({ sections });
  }

  function deleteLesson(si: number, li: number) {
    Alert.alert('Delete Lesson', 'Remove this lesson?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          const sections = [...form.sections];
          const sec = { ...sections[si] };
          sec.lessons = sec.lessons.filter((_, i) => i !== li).map((l, i) => ({ ...l, order: i }));
          sections[si] = sec;
          update({ sections });
        },
      },
    ]);
  }

  function addSection() {
    const next = [
      ...form.sections,
      { title: `Section ${form.sections.length + 1}`, description: '', order: form.sections.length, lessons: [] },
    ];
    update({ sections: next });
  }

  function deleteSection(si: number) {
    Alert.alert('Delete Section', `Remove "${form.sections[si].title}" and all its lessons?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          update({ sections: form.sections.filter((_, i) => i !== si).map((s, i) => ({ ...s, order: i })) });
        },
      },
    ]);
  }

  function saveSectionTitle(si: number) {
    if (!editingSectionTitle.trim()) return;
    const sections = [...form.sections];
    sections[si] = { ...sections[si], title: editingSectionTitle.trim() };
    update({ sections });
    setEditingSectionIdx(null);
  }

  return (
    <View style={shared.stepContent}>
      <Text style={[curr.curriculumHint, { color: theme.textSecondary }]}>
        Organise your content into sections. Each section contains lessons students complete in order.
      </Text>

      {form.sections.map((section, si) => (
        <View key={si} style={[curr.sectionWrap, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <View style={[curr.sectionHead, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={[curr.sectionNum, { backgroundColor: theme.primary }]}>
              <Text style={curr.sectionNumText}>{si + 1}</Text>
            </View>
            {editingSectionIdx === si ? (
              <TextInput
                style={[curr.sectionTitleInput, { color: theme.text, borderColor: theme.primary, flex: 1 }]}
                value={editingSectionTitle}
                onChangeText={setEditingSectionTitle}
                onBlur={() => saveSectionTitle(si)}
                onSubmitEditing={() => saveSectionTitle(si)}
                autoFocus
              />
            ) : (
              <Text style={[curr.sectionTitle, { color: theme.text }]} numberOfLines={1}>{section.title}</Text>
            )}
            <View style={curr.sectionActions}>
              <Text style={[curr.lessonCount, { color: theme.textSecondary }]}>
                {section.lessons.length} lesson{section.lessons.length !== 1 ? 's' : ''}
              </Text>
              <Pressable hitSlop={8} onPress={() => { setEditingSectionTitle(section.title); setEditingSectionIdx(si); }}>
                <Text style={[curr.editBtn, { color: theme.primary }]}>Edit</Text>
              </Pressable>
              {form.sections.length > 1 && (
                <Pressable hitSlop={8} onPress={() => deleteSection(si)}>
                  <Trash size={15} color={theme.error} weight="regular" />
                </Pressable>
              )}
            </View>
          </View>

          <View style={curr.lessonsWrap}>
            {section.lessons.map((lesson, li) => (
              <LessonEditor
                key={`${si}-${li}`}
                lesson={lesson}
                theme={theme}
                onUpdate={(changes) => updateLesson(si, li, changes)}
                onDelete={() => deleteLesson(si, li)}
              />
            ))}
            <Pressable onPress={() => addLesson(si)} style={[curr.addLessonBtn, { borderColor: theme.border }]}>
              <Plus size={14} color={theme.primary} weight="regular" />
              <Text style={[curr.addLessonText, { color: theme.primary }]}>Add Lesson</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Pressable onPress={addSection} style={[curr.addSectionBtn, { borderColor: theme.border }]}>
        <Plus size={16} color={theme.primary} weight="regular" />
        <Text style={[curr.addSectionBtnText, { color: theme.primary }]}>Add Section</Text>
      </Pressable>
    </View>
  );
}

const curr = StyleSheet.create({
  curriculumHint: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18 },
  sectionWrap: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, overflow: 'hidden' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionNum: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sectionNumText: { fontSize: 12, fontFamily: Fonts.bold, color: '#fff' },
  sectionTitle: { flex: 1, fontSize: 14, fontFamily: Fonts.semiBold },
  sectionTitleInput: { fontSize: 14, fontFamily: Fonts.semiBold, borderBottomWidth: 1, paddingVertical: 2 },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lessonCount: { fontSize: 11, fontFamily: Fonts.regular },
  editBtn: { fontSize: 12, fontFamily: Fonts.semiBold },
  lessonsWrap: { padding: 10, gap: 8 },
  addLessonBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 10, borderStyle: 'dashed' },
  addLessonText: { fontSize: 13, fontFamily: Fonts.semiBold },
  addSectionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 14, borderStyle: 'dashed' },
  addSectionBtnText: { fontSize: 14, fontFamily: Fonts.semiBold },
  lessonCard: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  lessonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  lessonHeaderTitle: { flex: 1, fontSize: 13, fontFamily: Fonts.medium },
  lessonBody: { borderTopWidth: StyleSheet.hairlineWidth, padding: 12, gap: 14 },
  lessonTitleInput: { height: 42, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, fontFamily: Fonts.regular },
  emptyHint: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', paddingVertical: 8 },
  mediaBox: { borderWidth: 1, borderRadius: 10, borderStyle: 'dashed', height: 160, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mediaFileName: { fontSize: 12, fontFamily: Fonts.medium, maxWidth: 240, textAlign: 'center' },
  mediaPct: { fontSize: 12, fontFamily: Fonts.semiBold },
  mediaTapChange: { fontSize: 11, fontFamily: Fonts.regular },
  mediaPrompt: { fontSize: 14, fontFamily: Fonts.medium },
  mediaHint: { fontSize: 12, fontFamily: Fonts.regular },
  mediaOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', gap: 8 },
  mediaOverlayText: { color: '#fff', fontSize: 14, fontFamily: Fonts.bold },
  durationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  durationLabel: { fontSize: 13, fontFamily: Fonts.medium, flex: 1 },
  durationValue: { fontSize: 13, fontFamily: Fonts.semiBold },
  durationInput: { width: 70, height: 36, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, fontSize: 14, fontFamily: Fonts.semiBold, textAlign: 'center' },
  qCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, gap: 10 },
  qHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qNum: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  qNumText: { fontSize: 11, fontFamily: Fonts.bold, color: '#fff' },
  qLabel: { flex: 1, fontSize: 12, fontFamily: Fonts.regular },
  qInput: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: Fonts.regular, minHeight: 44 },
  optLabel: { fontSize: 12, fontFamily: Fonts.medium },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optCheck: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  optText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular },
  optInput: { flex: 1, height: 36, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, paddingHorizontal: 10, fontSize: 13, fontFamily: Fonts.regular },
  addOptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  addOptText: { fontSize: 12, fontFamily: Fonts.semiBold },
  addQuestionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 10, borderStyle: 'dashed' },
  addQuestionText: { fontSize: 13, fontFamily: Fonts.semiBold },
});
