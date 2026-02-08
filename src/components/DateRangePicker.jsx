import React, { useState, useEffect } from 'react';
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

const DateRangePicker = ({ className, date, setDate, preset, setPreset }) => {
  const { businessCreatedAt } = useAdminContext();
  const [minDate, setMinDate] = useState(new Date(2020, 0, 1));

  useEffect(() => {
    if (businessCreatedAt) {
      const businessDate = new Date(businessCreatedAt);
      businessDate.setHours(0, 0, 0, 0);
      setMinDate(businessDate);
    }
  }, [businessCreatedAt]);

  const presets = [
    { value: 'daily', label: 'Son 24 Saat' },
    { value: '7days', label: 'Son 7 Gün' },
    { value: '30days', label: 'Son 30 Gün' },
    { value: 'thisMonth', label: 'Bu Ay' },
    { value: 'lastMonth', label: 'Geçen Ay' },
    { value: '6months', label: 'Son 6 Ay' },
    { value: '12months', label: 'Son 1 Yıl' },
    { value: 'allTime', label: 'Tüm Zamanlar' },
  ];

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

  const selectedLabel = presets.find(p => p.value === preset)?.label;

  return (
    <div className={cn("flex items-center", className)}>
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-full md:w-[180px] bg-slate-800 border-slate-700 text-white h-10">
          <SelectValue placeholder="Zaman Aralığı">
            {selectedLabel || "Zaman Aralığı"}
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