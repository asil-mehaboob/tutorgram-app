import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Star, ChatCircle, Question } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing, BottomTabInset } from '@/constants/theme';
import { getMessages, getQA, getCommunicationReviews } from '@/lib/api/tutor-communications';
import type { TutorMessage, TutorQuestion, TutorReview } from '@/lib/api/tutor-communications';

type Tab = 'messages' | 'qa' | 'reviews';

function StarRow({ rating }: { rating: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12} color={s <= rating ? theme.star : theme.border} weight="fill" />
      ))}
    </View>
  );
}

function MessageCard({ item }: { item: TutorMessage }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.avatarCircle, { backgroundColor: theme.primaryLight }]}>
        <Text style={[styles.avatarText, { color: theme.primary }]}>
          {item.studentName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={[styles.studentName, { color: theme.text }]} numberOfLines={1}>{item.studentName}</Text>
          <Text style={[styles.timeText, { color: theme.textSecondary }]}>
            {new Date(item.lastMessageAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <Text style={[styles.courseContext, { color: theme.textSecondary }]} numberOfLines={1}>{item.courseTitle}</Text>
        <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
      {item.isUnread && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
    </View>
  );
}

function QuestionCard({ item }: { item: TutorQuestion }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={[styles.studentName, { color: theme.text }]} numberOfLines={1}>{item.studentName}</Text>
          {!item.isAnswered && (
            <View style={[styles.unansweredBadge, { backgroundColor: theme.error }]}>
              <Text style={styles.unansweredText}>Unanswered</Text>
            </View>
          )}
        </View>
        <Text style={[styles.courseContext, { color: theme.textSecondary }]} numberOfLines={1}>{item.courseTitle}</Text>
        <Text style={[styles.questionText, { color: theme.text }]} numberOfLines={3}>{item.question}</Text>
        {item.answer && (
          <Text style={[styles.answerText, { color: theme.textSecondary }]} numberOfLines={2}>
            You: {item.answer}
          </Text>
        )}
      </View>
    </View>
  );
}

function ReviewCard({ item }: { item: TutorReview }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={[styles.studentName, { color: theme.text }]} numberOfLines={1}>{item.studentName}</Text>
          <StarRow rating={item.rating} />
        </View>
        <Text style={[styles.courseContext, { color: theme.textSecondary }]} numberOfLines={1}>{item.courseTitle}</Text>
        {item.title && (
          <Text style={[styles.reviewTitle, { color: theme.text }]}>{item.title}</Text>
        )}
        <Text style={[styles.questionText, { color: theme.textSecondary }]} numberOfLines={3}>{item.comment}</Text>
        {item.tutorReply && (
          <View style={[styles.replyBox, { backgroundColor: theme.surfaceEl, borderLeftColor: theme.primary }]}>
            <Text style={[styles.answerText, { color: theme.textSecondary }]}>Your reply: {item.tutorReply}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function TutorCommunications() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('messages');

  const messagesQ = useQuery({ queryKey: ['tutor-messages'], queryFn: getMessages, staleTime: 60_000 });
  const qaQ = useQuery({ queryKey: ['tutor-qa'], queryFn: getQA, staleTime: 60_000 });
  const reviewsQ = useQuery({ queryKey: ['tutor-reviews'], queryFn: getCommunicationReviews, staleTime: 60_000 });

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'messages', label: 'Messages', icon: <ChatCircle size={16} color={tab === 'messages' ? theme.primary : theme.textSecondary} weight={tab === 'messages' ? 'fill' : 'regular'} /> },
    { key: 'qa', label: 'Q&A', icon: <Question size={16} color={tab === 'qa' ? theme.primary : theme.textSecondary} weight={tab === 'qa' ? 'fill' : 'regular'} /> },
    { key: 'reviews', label: 'Reviews', icon: <Star size={16} color={tab === 'reviews' ? theme.primary : theme.textSecondary} weight={tab === 'reviews' ? 'fill' : 'regular'} /> },
  ];

  const activeQ = tab === 'messages' ? messagesQ : tab === 'qa' ? qaQ : reviewsQ;
  const activeData = (tab === 'messages' ? messagesQ.data : tab === 'qa' ? qaQ.data : reviewsQ.data) ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Inbox</Text>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tabItem}>
            <View style={styles.tabInner}>
              {t.icon}
              <Text style={[styles.tabLabel, { color: t.key === tab ? theme.primary : theme.textSecondary }]}>
                {t.label}
              </Text>
            </View>
            {t.key === tab && <View style={[styles.tabIndicator, { backgroundColor: theme.primary }]} />}
          </Pressable>
        ))}
      </View>

      {activeQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : activeData.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {tab === 'messages' ? 'No messages yet' : tab === 'qa' ? 'No questions yet' : 'No reviews yet'}
          </Text>
        </View>
      ) : tab === 'messages' ? (
        <FlatList
          data={messagesQ.data}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <MessageCard item={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + 16 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : tab === 'qa' ? (
        <FlatList
          data={qaQ.data}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <QuestionCard item={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + 16 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={reviewsQ.data}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <ReviewCard item={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset + 16 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 26, fontFamily: Fonts.extraBold, letterSpacing: -0.5 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 12 },
  tabLabel: { fontSize: 13, fontFamily: Fonts.semiBold },
  tabIndicator: { height: 2, width: '60%', borderRadius: 1 },
  list: { padding: Spacing.three, gap: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15, fontFamily: Fonts.regular, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 16, fontFamily: Fonts.bold },
  cardBody: { flex: 1, gap: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  studentName: { fontSize: 14, fontFamily: Fonts.semiBold, flex: 1 },
  timeText: { fontSize: 11, fontFamily: Fonts.regular },
  courseContext: { fontSize: 11, fontFamily: Fonts.regular },
  previewText: { fontSize: 13, fontFamily: Fonts.regular, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  unansweredBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  unansweredText: { fontSize: 10, fontFamily: Fonts.bold, color: '#fff' },
  questionText: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18, marginTop: 2 },
  answerText: { fontSize: 12, fontFamily: Fonts.regular, fontStyle: 'italic', marginTop: 4 },
  reviewTitle: { fontSize: 13, fontFamily: Fonts.semiBold, marginTop: 2 },
  replyBox: { marginTop: 8, padding: 8, borderRadius: 6, borderLeftWidth: 2 },
});
