import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';

// Génère une liste d'années (de l'année courante - 5 ans à aujourd'hui)
const getYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y);
  }
  return years;
};

const MONTHS = {
  fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
};

const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

const formatDate = (date, lang) => {
  if (!date) return '';
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = MONTHS[lang][d.getMonth()];
  const year = d.getFullYear();
  return lang === 'ar' ? `${year} ${month} ${day}` : `${day} ${month} ${year}`;
};

const DatePickerInput = ({ label, value, onChange, isRTL, lang = 'fr', error }) => {
  const [showModal, setShowModal] = useState(false);
  const today = new Date();

  const [selectedDay, setSelectedDay] = useState(value ? new Date(value).getDate() : today.getDate());
  const [selectedMonth, setSelectedMonth] = useState(value ? new Date(value).getMonth() + 1 : today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(value ? new Date(value).getFullYear() : today.getFullYear());

  const years = getYears();
  const months = MONTHS[lang];
  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirm = () => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`;
    onChange(dateStr);
    setShowModal(false);
  };

  const labels = {
    fr: { title: 'Date de naissance', confirm: 'Confirmer', cancel: 'Annuler', day: 'Jour', month: 'Mois', year: 'Année', placeholder: 'Sélectionner la date' },
    ar: { title: 'تاريخ الميلاد', confirm: 'تأكيد', cancel: 'إلغاء', day: 'اليوم', month: 'الشهر', year: 'السنة', placeholder: 'اختر التاريخ' },
  };
  const l = labels[lang];

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, isRTL && styles.rtl]}>{label}</Text>
      )}

      <TouchableOpacity
        style={[styles.trigger, error && styles.triggerError]}
        onPress={() => setShowModal(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={styles.calIcon}>📅</Text>
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {value ? formatDate(value, lang) : l.placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, isRTL && styles.rtl]}>⚠ {error}</Text>
      )}

      {/* Modal sélecteur */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtn}>{l.cancel}</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>{l.title}</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={styles.confirmBtn}>{l.confirm}</Text>
              </TouchableOpacity>
            </View>

            {/* Colonnes Jour / Mois / Année */}
            <View style={styles.columnsRow}>
              {/* Jours */}
              <View style={styles.column}>
                <Text style={styles.columnLabel}>{l.day}</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                  {days.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.item, selectedDay === d && styles.itemSelected]}
                      onPress={() => setSelectedDay(d)}
                    >
                      <Text style={[styles.itemText, selectedDay === d && styles.itemTextSelected]}>
                        {String(d).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Mois */}
              <View style={[styles.column, styles.columnWide]}>
                <Text style={styles.columnLabel}>{l.month}</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                  {months.map((m, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.item, selectedMonth === idx + 1 && styles.itemSelected]}
                      onPress={() => setSelectedMonth(idx + 1)}
                    >
                      <Text style={[styles.itemText, selectedMonth === idx + 1 && styles.itemTextSelected]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Années */}
              <View style={styles.column}>
                <Text style={styles.columnLabel}>{l.year}</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                  {years.map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.item, selectedYear === y && styles.itemSelected]}
                      onPress={() => setSelectedYear(y)}
                    >
                      <Text style={[styles.itemText, selectedYear === y && styles.itemTextSelected]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    height: 52,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  triggerError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  calIcon: { fontSize: 18 },
  triggerText: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  placeholder: { color: colors.textHint },
  chevron: { fontSize: 12, color: colors.textSecondary },
  errorText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizes.xs,
    color: colors.danger,
  },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xxxl,
    ...shadows.card,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  },
  cancelBtn: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
  },
  confirmBtn: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  columnsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  column: { flex: 1 },
  columnWide: { flex: 2 },
  columnLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textHint,
    textAlign: 'center',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scroll: { maxHeight: 200 },
  item: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
    alignItems: 'center',
  },
  itemSelected: {
    backgroundColor: colors.primaryLight,
  },
  itemText: {
    fontSize: typography.fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  itemTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default DatePickerInput;