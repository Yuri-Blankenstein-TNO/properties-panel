export function LspIndicator(props) {
  const {
    active
  } = props;

  if (!active) {
    return null;
  }

  return <span class="bio-properties-panel-feel-indicator">
    =
  </span>;
}