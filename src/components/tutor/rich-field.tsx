import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  RichText,
  Toolbar,
  useEditorBridge,
  useEditorContent,
  TenTapStartKit,
  PlaceholderBridge,
  darkEditorTheme,
  darkEditorCss,
  DEFAULT_TOOLBAR_ITEMS,
} from '@10play/tentap-editor';
import { useThemeContext } from '@/lib/theme/context';
import { Colors, Fonts } from '@/constants/theme';
import { getAiComplete } from '@/lib/api/tutor-courses';

// Toolbar items for course content — no link/image/tasklist/code
const EDITOR_TOOLBAR_ITEMS = [
  DEFAULT_TOOLBAR_ITEMS[0],  // bold
  DEFAULT_TOOLBAR_ITEMS[1],  // italic
  DEFAULT_TOOLBAR_ITEMS[6],  // underline
  DEFAULT_TOOLBAR_ITEMS[7],  // strike
  DEFAULT_TOOLBAR_ITEMS[4],  // heading (opens H1-H6 sub-menu)
  DEFAULT_TOOLBAR_ITEMS[8],  // blockquote
  DEFAULT_TOOLBAR_ITEMS[10], // bullet list
  DEFAULT_TOOLBAR_ITEMS[9],  // ordered list
  DEFAULT_TOOLBAR_ITEMS[11], // indent
  DEFAULT_TOOLBAR_ITEMS[12], // outdent
  DEFAULT_TOOLBAR_ITEMS[13], // undo
  DEFAULT_TOOLBAR_ITEMS[14], // redo
];

type RichFieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
  maxLength?: number;  // kept for API compat — not enforced in rich editor
  minHeight?: number;
  aiField?: string;
  courseTitle?: string;
  rte?: boolean;  // kept for API compat — always rich editor now
};

export function RichField({
  label,
  value,
  onChangeText,
  placeholder,
  required,
  optional,
  minHeight = 150,
  aiField,
  courseTitle,
}: RichFieldProps) {
  const { resolvedTheme } = useThemeContext();
  const isDark = resolvedTheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const [aiLoading, setAiLoading] = useState(false);

  // Tracks last value we sent out — prevents sync loops
  const lastOutRef = useRef<string>(value ?? '');

  const bridgeExtensions = useMemo(
    () => [
      ...TenTapStartKit,
      PlaceholderBridge.configureExtension({
        placeholder: placeholder ?? 'Start typing…',
      }),
    ],
    [] // stable — placeholder won't change after mount
  );

  const editorTheme = useMemo(() => {
    const toolbarBg = isDark ? colors.surfaceEl : colors.surfaceEl;
    const iconColor = colors.text;
    return {
      ...(isDark ? darkEditorTheme : {}),
      toolbar: {
        toolbarBody: {
          flex: 1,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          borderBottomColor: colors.border,
          backgroundColor: toolbarBg,
          minWidth: '100%' as const,
          height: 44,
        },
        toolbarButton: {
          paddingHorizontal: 8,
          backgroundColor: toolbarBg,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
        },
        iconWrapper: { borderRadius: 4, backgroundColor: toolbarBg },
        iconWrapperActive: { backgroundColor: isDark ? '#6b7280' : colors.border },
        iconWrapperDisabled: { opacity: 0.3 },
        iconDisabled: { tintColor: '#CACACA' },
        hidden: { display: 'none' as const },
        icon: { height: 28, width: 28, tintColor: iconColor },
        iconActive: { tintColor: colors.primary },
        linkBarTheme: {},
        keyboardAvoidingView: { position: 'absolute' as const, width: '100%' as const, bottom: 0 },
      },
      webview: { backgroundColor: colors.surface },
      webviewContainer: {},
    };
  }, [isDark, colors]);

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: value || '<p></p>',
    bridgeExtensions,
    theme: editorTheme,
  });

  // Reactive HTML content from the editor
  const content = useEditorContent(editor, { type: 'html', debounceInterval: 150 });

  // Push editor changes to parent
  useEffect(() => {
    if (content !== undefined && content !== lastOutRef.current) {
      lastOutRef.current = content;
      onChangeText(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Pull external value changes into editor (AI complete, reset, etc.)
  useEffect(() => {
    if (value !== undefined && value !== lastOutRef.current) {
      lastOutRef.current = value;
      editor.setContent(value || '<p></p>');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Inject theme CSS once the WebView editor is ready
  const handleWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const { type } = JSON.parse(event.nativeEvent.data);
        if (type === 'editor-ready') {
          editor.injectCSS(`
            ${isDark ? darkEditorCss : ''}
            * { background-color: ${colors.surface} !important; color: ${colors.text} !important; }
            .ProseMirror { padding: 12px; font-size: 15px; line-height: 1.65; }
            .ProseMirror p { margin: 0 0 8px; }
            .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 { font-weight: 700; margin: 12px 0 6px; }
            .ProseMirror h1 { font-size: 22px; }
            .ProseMirror h2 { font-size: 18px; }
            .ProseMirror h3 { font-size: 16px; }
            .ProseMirror ul, .ProseMirror ol { padding-left: 20px; margin: 8px 0; }
            .ProseMirror li { margin-bottom: 4px; }
            .ProseMirror blockquote {
              border-left: 3px solid ${colors.border};
              margin: 8px 0;
              padding-left: 14px;
              color: ${colors.textSecondary} !important;
              font-style: italic;
            }
            .ProseMirror strong { font-weight: 700; }
            .ProseMirror em { font-style: italic; }
            .ProseMirror u { text-decoration: underline; }
            .ProseMirror s { text-decoration: line-through; }
          `);
        }
      } catch {}
    },
    [isDark, colors, editor]
  );

  async function handleAiComplete() {
    if (!aiField) return;
    setAiLoading(true);
    try {
      const currentHtml = await editor.getHTML();
      const ctx: Record<string, string> = { courseTitle: courseTitle ?? '' };
      const stripped = currentHtml?.replace(/<[^>]*>/g, '').trim();
      if (stripped) ctx.currentContent = stripped.slice(0, 500);
      const result = await getAiComplete(aiField, ctx);
      const html = result.completion;
      lastOutRef.current = html;
      editor.setContent(html);
      onChangeText(html);
    } catch (e: any) {
      Alert.alert('AI Complete failed', e?.message ?? 'Could not generate content. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Label + AI button */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
          {optional && <Text style={[styles.optional, { color: colors.textSecondary }]}> (optional)</Text>}
        </Text>
        {aiField && (
          <Pressable
            onPress={handleAiComplete}
            disabled={aiLoading}
            style={[
              styles.aiBtn,
              { borderColor: colors.border, backgroundColor: colors.surface, opacity: aiLoading ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.aiBtnText, { color: colors.text }]}>
              {aiLoading ? 'Completing…' : 'Complete with AI'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Bordered editor container */}
      <View style={[styles.editorBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {/* Formatting toolbar — always visible */}
        <Toolbar editor={editor} hidden={false} items={EDITOR_TOOLBAR_ITEMS} />

        {/* TipTap WebView editor — fixed height prevents infinite growth in ScrollView */}
        <View style={{ height: minHeight }}>
          <RichText
            editor={editor}
            onMessage={handleWebViewMessage}
            exclusivelyUseCustomOnMessage={false}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, flexShrink: 1 },
  optional: { fontSize: 12, fontFamily: Fonts.regular },
  aiBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  aiBtnText: { fontSize: 12, fontFamily: Fonts.semiBold },
  editorBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
