import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../../navigation/types';
import { categoryApi } from '../../api/categoryApi';
import { Category } from '../../types';
import { MOCK_CATEGORIES } from '../../constants/mockData';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Header } from '../../components/common/Header';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type AllCategoriesNavProp = CompositeNavigationProp<
  StackNavigationProp<RootStackParamList, 'AllCategories'>,
  BottomTabNavigationProp<MainTabParamList>
>;

interface Props {
  navigation: AllCategoriesNavProp;
}

export const AllCategoriesScreen: React.FC<Props> = ({ navigation }) => {
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [refreshing, setRefreshing] = useState(false);

  const loadCategories = async () => {
    try {
      const list = await categoryApi.getAllCategories();
      if (Array.isArray(list) && list.length > 0) {
        setCategories(list);
      }
    } catch (e) {
      console.warn('Error loading categories:', e);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  const handleSelectCategory = (cat: Category) => {
    try {
      const parentNav = navigation.getParent<StackNavigationProp<RootStackParamList>>();
      if (parentNav) {
        parentNav.navigate('ServiceListing', {
          categoryId: cat.id,
          categoryName: cat.name,
        });
      } else {
        (navigation as any).navigate('ServiceListing', {
          categoryId: cat.id,
          categoryName: cat.name,
        });
      }
    } catch {
      (navigation as any).navigate('ServiceListing', {
        categoryId: cat.id,
        categoryName: cat.name,
      });
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('HomeTab');
    }
  };

  const renderIcon = (cat: Category) => {
    const size = 26;
    const color = COLORS.primaryDark;
    const iconName = cat.iconName || 'grid-outline';
    if (cat.iconType === 'Ionicons') {
      return <Ionicons name={iconName as any} size={size} color={color} />;
    }
    return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
  };

  return (
    <ScreenWrapper>
      <Header
        title="Categories"
        onBack={handleBack}
        showBack={true}
      />

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            activeOpacity={0.8}
            onPress={() => handleSelectCategory(cat)}
            style={[styles.categoryCard, SHADOWS.card]}
          >
            <View style={styles.iconCircle}>{renderIcon(cat)}</View>

            <View style={styles.textContainer}>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {cat.subtitle}
              </Text>
            </View>

            <View style={styles.chevronBox}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.primaryDark} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: 100,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(235, 245, 240, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 14,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  chevronBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
