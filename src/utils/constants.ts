export interface FrequenceOption {
  value: string
  label: string
}

export const FREQUENCE_OPTIONS: FrequenceOption[] = [
  { value: 'Matin', label: 'Matin' },
  { value: 'Midi', label: 'Midi' },
  { value: 'Soir', label: 'Soir' },
  { value: 'Nuit', label: 'Nuit' },
]

export type FrequenceValue = 'Matin' | 'Midi' | 'Soir' | 'Nuit'
