import { createContext, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CheckCircle,
  Info,
  Warning,
  XCircle,
} from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';

// ─── types ────────────────────────────────────────────────────────────────────

export type DialogAction = {
  label: string;
  onPress?: () => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'cancel';
  loading?: boolean;
};

export type DialogConfig = {
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  actions?: DialogAction[];
};

type DialogContextType = {
  showDialog: (config: DialogConfig) => void;
  hideDialog: () => void;
};

// ─── context ──────────────────────────────────────────────────────────────────

const DialogContext = createContext<DialogContextType>({
  showDialog: () => {},
  hideDialog: () => {},
});

// ─── icon mapping ─────────────────────────────────────────────────────────────

const TYPE_ICON: Record<NonNullable<DialogConfig['type']>, { Icon: React.ComponentType<any>; color: string }> = {
  info:    { Icon: Info,        color: '#7C8EF8' },
  success: { Icon: CheckCircle, color: '#22C55E' },
  error:   { Icon: XCircle,     color: '#EF4444' },
  warning: { Icon: Warning,     color: '#F59E0B' },
};

// ─── provider ─────────────────────────────────────────────────────────────────

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const [config, setConfig] = useState<DialogConfig | null>(null);
  const [pending, setPending] = useState(false);

  function showDialog(cfg: DialogConfig) {
    setPending(false);
    setConfig(cfg);
  }

  function hideDialog() {
    if (pending) return;
    setConfig(null);
  }

  const actions: DialogAction[] = config?.actions?.length
    ? config.actions
    : [{ label: 'OK', variant: 'default' }];

  const iconConfig = config?.type ? TYPE_ICON[config.type] : null;

  async function handleAction(action: DialogAction) {
    if (action.onPress) {
      const result = action.onPress();
      if (result instanceof Promise) {
        setPending(true);
        try { await result; } finally { setPending(false); }
      }
    }
    setConfig(null);
  }

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog }}>
      {children}
      <Modal
        visible={!!config}
        transparent
        animationType="fade"
        onRequestClose={hideDialog}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={hideDialog}>
          <Pressable
            style={[styles.dialog, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {}}
          >
            {iconConfig && (
              <View style={styles.iconWrap}>
                <iconConfig.Icon size={30} color={iconConfig.color} weight="regular" />
              </View>
            )}

            <Text style={[styles.title, { color: theme.text }]}>{config?.title}</Text>

            {!!config?.message && (
              <Text style={[styles.message, { color: theme.textSecondary }]}>{config.message}</Text>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.actionsRow}>
              {actions.map((action, i) => {
                const isDestructive = action.variant === 'destructive';
                const isLast = i === actions.length - 1;
                return (
                  <View key={i} style={[styles.actionCell, !isLast && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border }]}>
                    <Pressable
                      onPress={() => handleAction(action)}
                      disabled={pending}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        isDestructive && styles.actionBtnDestructive,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      {pending && isDestructive ? (
                        <ActivityIndicator size={14} color="#fff" />
                      ) : (
                        <Text style={[
                          styles.actionLabel,
                          { color: isDestructive ? '#fff' : action.variant === 'cancel' ? theme.textSecondary : theme.primary },
                        ]}>
                          {action.label}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useDialog() {
  return useContext(DialogContext);
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  dialog: {
    width: '100%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 24,
  },
  iconWrap: {
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  actionsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  actionCell: {
    flex: 1,
  },
  actionBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDestructive: {
    backgroundColor: '#EF4444',
  },
  actionLabel: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
  },
});
