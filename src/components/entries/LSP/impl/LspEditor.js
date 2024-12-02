import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as placeholderExt, tooltips } from '@codemirror/view';
import { languageServerWithTransport, LanguageServerClient } from 'codemirror-languageserver';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { setDiagnosticsEffect } from '@codemirror/lint';
import { WebSocketTransport } from '@open-rpc/client-js';
import { isFunction } from 'min-dash';
import WS from "isomorphic-ws";

import theme from './theme';

const placeholderConf = new Compartment();

/**
 * @typedef {import('@codemirror/language').LanguageSupport} LanguageSupport
 */

/**
 * Creates an LSP editor in the supplied container
 *
 * @param {Object} config
 * @param {Extension[]} [config.extensions]
 * @param {DOMNode} config.container
 * @param {Object} config.contentAttributes
 * @param {DOMNode|String} [config.tooltipContainer]
 * @param {Function} [config.onChange]
 * @param {Function} [config.onKeyDown]
 * @param {String} [config.placeholder]
 * @param {Boolean} [config.readOnly]
 * @param {String} [config.value]
 * @param {String} [config.documentUri]
 * @param {String} [config.rootUri]
 * @param {String} [config.languageId]
 * @param {LanguageSupport} [config.languageSupport]
 * @param {String} [config.serverUri]
 *
 * @returns {Object} editor
 */
export default class LspEditor {
  constructor({
    extensions: editorExtensions = [],
    container,
    contentAttributes = {},
    tooltipContainer,
    onChange = () => { },
    onKeyDown = () => { },
    onLint = () => {},
    onConnectionError,
    placeholder = '',
    readOnly = false,
    value = '',
    prefix,
    suffix,
    languageId,
    languageSupport,
    documentUri = `inmemory:/document.${languageId}`,
    rootUri = documentUri.substring(0, documentUri.lastIndexOf('/') + 1),
    serverUri,
  }) {
    if (languageId === undefined) {
      throw new Error('Missing manadatory parameter: languageId');
    }
    if (serverUri === undefined) {
      throw new Error('Missing manadatory parameter: serverUri');
    }

    const changeHandler = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const lintHandler = EditorView.updateListener.of((update) => {
      const diagnosticEffects = update.transactions
        .flatMap(t => t.effects)
        .filter(effect => effect.is(setDiagnosticsEffect));

      if (!diagnosticEffects.length) {
        return;
      }

      const messages = diagnosticEffects.flatMap(effect => effect.value);

      onLint(messages);
    });

    const keyHandler = EditorView.domEventHandlers({
      keydown: onKeyDown
    });

    if (typeof tooltipContainer === 'string') {
      tooltipContainer = document.querySelector(tooltipContainer);
    }

    const tooltipLayout = tooltipContainer ? tooltips({
      tooltipSpace: function() {
        return tooltipContainer.getBoundingClientRect();
      }
    }) : [];

    if (isFunction(onConnectionError)) {
      const ws = new WS(serverUri);
      ws.addEventListener('open', (event) => {
        event.target.close();
      });
      ws.addEventListener('error', (event) => {
        onConnectionError(`WebSocket connection to '${serverUri}' failed.`);
      });
    }

    this._client = new LanguageServerClient({
      transport: new WebSocketTransport(serverUri),
      rootUri
    });

    const extensions = [
      autocompletion(),
      languageServerWithTransport({
        client: this._client,
        documentUri,
        languageId,
        prefix,
        suffix
      }),
      bracketMatching(),
      indentOnInput(),
      closeBrackets(),
      EditorView.contentAttributes.of(contentAttributes),
      changeHandler,
      keyHandler,
      keymap.of([
        indentWithTab,
        ...defaultKeymap
      ]),
      lintHandler,
      tooltipLayout,
      placeholderConf.of(placeholderExt(placeholder)),
      theme,
      ...editorExtensions
    ];

    if (languageSupport) {
      extensions.push(languageSupport);
    }

    if (readOnly) {
      extensions.push(EditorView.editable.of(false));
    }

    this._cmEditor = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: extensions
      }),
      parent: container
    });
  }

  /**
   * Replaces the content of the Editor
   *
   * @param {String} value
   */
  setValue(value) {
    this._cmEditor.dispatch({
      changes: {
        from: 0,
        to: this._cmEditor.state.doc.length,
        insert: value,
      }
    });
  }

  /**
   * Sets the focus in the editor.
   */
  focus(position) {
    const cmEditor = this._cmEditor;

    // the Codemirror `focus` method always calls `focus` with `preventScroll`,
    // so we have to focus + scroll manually
    cmEditor.contentDOM.focus();
    cmEditor.focus();

    if (typeof position === 'number') {
      const end = cmEditor.state.doc.length;
      cmEditor.dispatch({ selection: { anchor: position <= end ? position : end } });
    }
  }

  /**
   * Returns the current selection ranges. If no text is selected, a single
   * range with the start and end index at the cursor position will be returned.
   *
   * @returns {Object} selection
   * @returns {Array} selection.ranges
   */
  getSelection() {
    return this._cmEditor.state.selection;
  }

  /**
   * Update placeholder text.
   *
   * @param {string} placeholder
   */
  setPlaceholder(placeholder) {
    this._cmEditor.dispatch({
      effects: placeholderConf.reconfigure(placeholderExt(placeholder))
    });
  }

  /**
   * Frees all resources claimed by this editor.
   */
  dispose() {
    if (this._client) {
      this._client.close();
      this._client = undefined;
    }
  }
}