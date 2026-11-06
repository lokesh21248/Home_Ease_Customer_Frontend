import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { bookingApi } from '../../api/client';

const { width } = Dimensions.get('window');

const RATING_LABELS: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Fair Experience',
  3: 'Good Service',
  4: 'Very Good & Professional',
  5: 'Exceptional Service! 🌟',
};

const QUICK_TAGS = [
  'Punctual & On Time',
  'Professional & Polite',
  'Deep & Thorough Cleaning',
  'Clean & Tidy Work',
  'High Quality Tools',
  'Safety Verified',
];

interface RatingModalProps {
  visible: boolean;
  bookingId: string;
  workerName?: string | null;
  serviceName?: string | null;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  bookingId,
  workerName,
  serviceName,
  onClose,
  onSubmitSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Punctual & On Time', 'Professional & Polite']);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (!bookingId) return;
    setIsSubmitting(true);
    try {
      await bookingApi.rateBooking(bookingId, rating, comment.trim(), selectedTags);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onSubmitSuccess?.();
        onClose();
      }, 1500);
    } catch (e) {
      console.warn('[RatingModal] rating submit warning:', e);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onSubmitSuccess?.();
        onClose();
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {isSubmitted ? (
            <View style={styles.successContainer}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>Thank You!</Text>
              <Text style={styles.successSub}>
                Your feedback helps us maintain the highest standard of service.
              </Text>
            </View>
          ) : (
            <>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>

              {/* Title & Service Info */}
              <View style={styles.header}>
                <View style={styles.avatarPill}>
                  <Text style={styles.avatarLetter}>
                    {(workerName || 'H').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.title}>
                  How was your service with {workerName || 'our professional'}?
                </Text>
                {serviceName && (
                  <Text style={styles.subtitle}>{serviceName}</Text>
                )}
              </View>

              {/* Star Rating Selector */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= rating;
                  return (
                    <TouchableOpacity
                      key={star}
                      style={styles.starBtn}
                      onPress={() => setRating(star)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isFilled ? 'star' : 'star-outline'}
                        size={36}
                        color={isFilled ? '#F59E0B' : '#CBD5E1'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>

              {/* Quick Tags */}
              <View style={styles.tagsContainer}>
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagPill,
                        isSelected && styles.tagPillSelected,
                      ]}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          isSelected && styles.tagTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Optional Comment Input */}
              <TextInput
                style={styles.commentInput}
                placeholder="Share more details about your experience (optional)..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={comment}
                onChangeText={setComment}
                maxLength={300}
              />

              {/* Submit CTA */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#074BD4', '#005CE6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Rating & Review</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.base,
  },
  modalCard: {
    width: Math.min(width - 32, 420),
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarPill: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  avatarLetter: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 22,
    color: '#074BD4',
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 16,
    color: '#0F172A',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: Spacing.sm,
  },
  starBtn: {
    padding: 4,
  },
  ratingLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#D97706',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
    justifyContent: 'center',
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagPillSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  tagText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
    color: '#64748B',
  },
  tagTextSelected: {
    color: '#074BD4',
    fontFamily: Typography.fontFamily.bold,
  },
  commentInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 70,
    marginBottom: Spacing.base,
  },
  submitBtn: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  successTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 20,
    color: '#0F172A',
    marginBottom: 6,
  },
  successSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
});

