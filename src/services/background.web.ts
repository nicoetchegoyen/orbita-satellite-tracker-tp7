export async function configureBackground(enabled: boolean) {
  if (enabled) throw new Error('El refresco en segundo plano requiere Android/iOS.');
}
