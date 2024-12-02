import classNames from 'classnames';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { forwardRef } from 'preact/compat';

import { LspEditor } from './impl';

import { EditorView, lineNumbers } from '@codemirror/view';

import { useStaticCallback } from '../../../hooks';

import { PopupIcon } from '../../icons';

const noop = () => {};

/**
 * Buffer `.focus()` calls while the editor is not initialized.
 * Set Focus inside when the editor is ready.
 */
const useBufferedFocus = function(editor, ref) {

  const [ buffer, setBuffer ] = useState(undefined);

  ref.current = useMemo(() => ({
    focus: (offset) => {
      if (editor) {
        editor.focus(offset);
      } else {
        if (typeof offset === 'undefined') {
          offset = Infinity;
        }
        setBuffer(offset);
      }
    }
  }), [ editor ]);

  useEffect(() => {
    if (typeof buffer !== 'undefined' && editor) {
      editor.focus(buffer);
      setBuffer(false);
    }
  }, [ editor, buffer ]);
};

const CodeEditor = forwardRef((props, ref) => {

  const {
    contentAttributes,
    enableGutters,
    value,
    prefix,
    suffix,
    languageId,
    languageSupport,
    documentUri,
    rootUri,
    serverUri,
    onInput,
    onLspToggle = noop,
    onLint = noop,
    onPopupOpen = noop,
    onConnectionError,
    placeholder,
    popupOpen,
    disabled,
    tooltipContainer
  } = props;

  const inputRef = useRef();
  const [ editor, setEditor ] = useState();
  const [ localValue, setLocalValue ] = useState(value || '');

  useBufferedFocus(editor, ref);

  const handleInput = useStaticCallback(newValue => {
    onInput(newValue);
    setLocalValue(newValue);
  });

  useEffect(() => {

    let editor;

    /* Trigger LSP toggle when
     *
     * - `backspace` is pressed
     * - AND the cursor is at the beginning of the input
     */
    const onKeyDown = e => {
      if (e.key !== 'Backspace' || !editor) {
        return;
      }

      const selection = editor.getSelection();
      const range = selection.ranges[selection.mainIndex];

      if (range.from === 0 && range.to === 0) {
        onLspToggle();
      }
    };

    editor = new LspEditor({
      container: inputRef.current,
      onChange: handleInput,
      onKeyDown: onKeyDown,
      onLint: onLint,
      onConnectionError: onConnectionError,
      placeholder: placeholder,
      tooltipContainer: tooltipContainer,
      value: localValue,
      prefix,
      suffix,
      languageId,
      languageSupport,
      documentUri,
      rootUri,
      serverUri,
      extensions: [
        ...enableGutters ? [ lineNumbers() ] : [],
        EditorView.lineWrapping
      ],
      contentAttributes
    });

    setEditor(
      editor
    );

    return () => {
      onLint([]);
      inputRef.current.innerHTML = '';
      if (!editor) {
        return;
      }
      editor.dispose();
      setEditor(null);
    };
  }, []);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (value === localValue) {
      return;
    }

    editor.setValue(value);
    setLocalValue(value);
  }, [ value ]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setPlaceholder(placeholder);
  }, [ placeholder ]);

  const handleClick = () => {
    ref.current.focus();
  };

  return <div class={ classNames(
    'bio-properties-panel-feel-editor-container',
    disabled ? 'disabled' : null,
    popupOpen ? 'popupOpen' : null)
  }>
    <div class="bio-properties-panel-feel-editor__open-popup-placeholder">Opened in editor</div>
    <div
      name={ props.name }
      class={ classNames('bio-properties-panel-input', localValue ? 'edited' : null) }
      ref={ inputRef }
      onClick={ handleClick }
    ></div>
    {popupOpen ? null : (
      <button
        type="button"
        title="Open pop-up editor"
        class="bio-properties-panel-open-feel-popup"
        onClick={ () => onPopupOpen() }><PopupIcon /></button>
    )}
  </div>;
});

export default CodeEditor;