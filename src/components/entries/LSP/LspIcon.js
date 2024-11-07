import classNames from 'classnames';
import { FeelIcon as LspIconSvg } from '../../icons';

const noop = () => {};

/**
 * @param {Object} props
 * @param {Object} props.label
 * @param {String} props.lsp
 */
export default function LspIcon(props) {

  const {
    lsp = false,
    active,
    disabled = false,
    onClick = noop
  } = props;

  const lspRequiredLabel = 'LSP expression is mandatory';
  const lspOptionalLabel = `Click to ${active ? 'remove' : 'set a'} dynamic value with LSP expression`;

  const handleClick = e => {
    onClick(e);

    // when pointer event was created from keyboard, keep focus on button
    if (!e.pointerType) {
      e.stopPropagation();
    }
  };

  return (
    <button
      type="button"
      class={ classNames('bio-properties-panel-feel-icon',
        active ? 'active' : null,
        lsp === 'required' ? 'required' : 'optional') }
      onClick={ handleClick }
      disabled={ lsp === 'required' || disabled }
      title={
        lsp === 'required' ? lspRequiredLabel : lspOptionalLabel
      }
    >
      <LspIconSvg />
    </button>
  );
}