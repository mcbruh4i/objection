/**
 * The Jalali date header: «امروز، سه‌شنبه ۳۰ تیر» — Persian digits,
 * weekday + Jalali day + month, computed from the device's local date.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "../common/AppText";
import { jalaliOfLocalDate, saturdayWeekdayIndex } from "../../utils/jalali";
import { toPersianDigits } from "../../utils/format";
import { theme } from "../../theme/tokens";

export function JalaliHeader(): React.JSX.Element {
  const { t } = useTranslation();
  const now = new Date();
  const j = jalaliOfLocalDate(now);
  const weekday = t(`calendar.weekday_${saturdayWeekdayIndex(now)}`);
  const month = t(`calendar.month_${j.jm}`);
  const headline = `${t("calendar.today_prefix")}، ${weekday} ${toPersianDigits(j.jd)} ${month}`;

  return (
    <View style={styles.wrap}>
      <AppText variant="display">{headline}</AppText>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.sm,
  },
  rule: {
    height: theme.borders.heavy,
    backgroundColor: theme.colors.line,
    borderRadius: theme.radii.none,
  },
});
