import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { RichField } from '@/components/tutor/rich-field';
import { SectionDivider, DelayMount, shared } from './shared';
import type { CourseForm } from './types';

type Props = {
  form: CourseForm;
  update: (changes: Partial<CourseForm>) => void;
};

// Each RichField is staggered so its bridge and WebView initialise one at a time.
// DelayMount delays the entire component (including the bridge) — not just the WebView.
export function Step3({ form, update }: Props) {
  const theme = useTheme();
  return (
    <View style={shared.stepContent}>
      <RichField
        label="What Students Will Learn"
        value={form.whatYouLearn}
        onChangeText={(v) => update({ whatYouLearn: v })}
        placeholder="List the key things students will be able to do after completing your course…"
        required
        minHeight={120}
        rte
        aiField="What students will learn"
        courseTitle={form.title}
      />

      <SectionDivider theme={theme} />

      <DelayMount delayMs={500}>
        <RichField
          label="Learning Outcomes"
          value={form.learningOutcomes}
          onChangeText={(v) => update({ learningOutcomes: v })}
          placeholder="Specific measurable outcomes students can expect…"
          optional
          minHeight={100}
          rte
          aiField="Course learning outcomes"
          courseTitle={form.title}
        />
      </DelayMount>

      <SectionDivider theme={theme} />

      <DelayMount delayMs={1000}>
        <RichField
          label="Who This Course Is For"
          value={form.whoIsFor}
          onChangeText={(v) => update({ whoIsFor: v })}
          placeholder="Describe the ideal students for this course…"
          optional
          minHeight={100}
          rte
          aiField="Target audience for the course"
          courseTitle={form.title}
        />
      </DelayMount>

      <SectionDivider theme={theme} />

      <DelayMount delayMs={1500}>
        <RichField
          label="Prerequisites"
          value={form.prerequisites}
          onChangeText={(v) => update({ prerequisites: v })}
          placeholder="List any knowledge, skills or tools students need before starting…"
          optional
          minHeight={100}
          rte
          aiField="Course prerequisites"
          courseTitle={form.title}
        />
      </DelayMount>
    </View>
  );
}
