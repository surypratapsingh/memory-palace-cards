/** Copy text and show the result on the button; a refused or missing clipboard shows "Copy failed" instead of throwing. */
export function copyWithFeedback(
  button: { textContent: string | null },
  text: string,
  clipboard: { writeText(t: string): Promise<void> } | undefined,
  resetMs = 2000,
): void {
  const label = button.textContent;
  const flash = (msg: string) => {
    button.textContent = msg;
    setTimeout(() => { button.textContent = label; }, resetMs);
  };
  if (!clipboard) return flash('Copy failed');
  clipboard.writeText(text).then(() => flash('Copied!'), () => flash('Copy failed'));
}
