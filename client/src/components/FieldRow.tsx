import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { colors } from '../theme';

interface FieldRowProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  flagged?: boolean;
  flagLabel?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  placeholder?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}

export function FieldRow({
  label,
  value,
  onChangeText,
  editable = true,
  flagged = false,
  flagLabel = 'Suggested',
  keyboardType = 'default',
  multiline = false,
  placeholder,
  right,
  onPress,
}: FieldRowProps) {
  const content = (
    <View style={[styles.container, flagged && styles.flaggedContainer]}>
      <View style={styles.labelRow}>
        <Text variant="labelMedium" style={styles.label}>
          {label}
        </Text>
        {flagged && (
          <View style={styles.flagBadge}>
            <Text style={styles.flagText}>{flagLabel}</Text>
          </View>
        )}
      </View>
      {editable && onChangeText ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          placeholder={placeholder}
          mode="outlined"
          dense
          style={styles.input}
          outlineStyle={styles.inputOutline}
        />
      ) : (
        <View style={styles.valueRow}>
          <Text variant="bodyLarge" style={styles.value}>
            {value || '—'}
          </Text>
          {right}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  flaggedContainer: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  flagBadge: {
    marginLeft: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  flagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warning,
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 16,
  },
  inputOutline: {
    borderRadius: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    color: colors.text,
    flex: 1,
  },
});
