import { Alert, Platform } from 'react-native';

type Choice<T> = { text: string; value: T; style?: 'default' | 'cancel' | 'destructive' };

/** Alert nativo com fallback para web (window.confirm), útil para testar no navegador. */
export function choose<T>(title: string, message: string, choices: Choice<T>[]): Promise<T | null> {
  if (Platform.OS === 'web') {
    const actionable = choices
      .filter((c) => c.style !== 'cancel')
      .sort((a, b) => Number(a.style === 'destructive') - Number(b.style === 'destructive'));
    for (const c of actionable) {
      if (window.confirm(`${title}\n\n${message}\n\n${c.text}?`)) return Promise.resolve(c.value);
    }
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      choices.map((c) => ({ text: c.text, style: c.style, onPress: () => resolve(c.value) })),
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

export async function confirm(title: string, message: string, okText = 'OK', destructive = false) {
  const r = await choose(title, message, [
    { text: 'Cancelar', value: false, style: 'cancel' },
    { text: okText, value: true, style: destructive ? 'destructive' : 'default' },
  ]);
  return r === true;
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
