import React, { useState, useEffect, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { startOfMonth, endOfMonth } from "date-fns";
import { useAdminContext } from '@/contexts/AdminContext';
import { useTranslation } from 'react-i18next';

const DateRangePicker = ({ className, date, setDate, preset, setPreset }) => {
  const { t } = useTranslation('common');
  const { businessCreatedAt } = useAdminContext();
  const [minDate, setMinDate] = useState(new Date(2020, 0, 1));

  useEffect(() => {
    if (businessCreatedAt) {
      const businessDate = new Date(businessCreatedAt);
      businessDate.setHours(0, 0, 0, 0);
      setMinDate(businessDate);
    }
  }, [businessCreatedAt]);

  const presets = useMemo(() => [
    { value: 'daily', label: t('date_ranges.daily') },
    { value: '7days', label: t('date_ranges.last7') },
    { value: '30days', label: t('date_ranges.last30') },
    { value: 'thisMonth', label: t('date_ranges.thisMonth') },
    { value: 'lastMonth', label: t('date_ranges.lastMonth') },
    { value: '6months', label: t('date_ranges.6months') },
    { value: '12months', label: t('date_ranges.12months') },
    { value: 'allTime', label: t('date_ranges.allTime') },
  ], [t]);

  const handlePresetChange = (value) => {
    if (setPreset) setPreset(value);

    const now = new Date();
    let fromDate = new Date();

    // Reset hours to start of day for fromDate
    fromDate.setHours(0, 0, 0, 0);
    // Set to end of day for "now" / "to" date
    now.setHours(23, 59, 59, 999);

    switch (value) {
      case 'daily':
        fromDate.setDate(now.getDate() - 1);
        break;
      case '7days':
        fromDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        fromDate.setDate(now.getDate() - 30);
        break;
      case 'thisMonth':
        fromDate = startOfMonth(now);
        break;
      case 'lastMonth':
        fromDate = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        now.setTime(endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)).getTime());
        now.setHours(23, 59, 59, 999);
        break;
      case '6months':
        fromDate.setMonth(now.getMonth() - 6);
        break;
      case '12months':
        fromDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'allTime':
        fromDate = minDate;
        break;
      default:
        break;
    }

    if (fromDate < minDate) {
      fromDate = minDate;
    }

    setDate({ from: fromDate, to: now });
  };

  const selectedLabel = useMemo(() => presets.find(p => p.value === preset)?.label, [presets, preset]);

  return (
    <div className={cn("flex items-center", className)}>
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full md:w-[180px] bg-slate-800 border-slate-700 text-white h-10">
          <SelectValue placeholder={t('header.time_range')}>
            {selectedLabel || t('header.time_range')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700 text-white">
          {presets.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DateRangePicker;