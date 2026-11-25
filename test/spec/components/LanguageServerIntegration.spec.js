import { expect } from 'chai';
import { stub } from 'sinon';
import { act, cleanup, render, waitFor } from '@testing-library/preact';
import { startCompletion } from '@codemirror/autocomplete';
import { json } from '@codemirror/lang-json';
import { forEachDiagnostic } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  languageServerWithTransport,
  formatDocument,
  SynchronizationMethod
} from 'codemirror-languageserver';
import EventBus from 'diagram-js/lib/core/EventBus';
import PropertiesPanel from 'src/PropertiesPanel';
import { syntaxClasses } from 'src/components/entries/LSP/impl/theme/theme';

class TestTransport {
  constructor() {
    this.messages = [];
  }

  onMessage(callback) {
    this.receive = callback;
  }

  onClose(callback) {
    this.closeHandler = callback;
  }

  onError() {}

  close() {
    this.closeHandler();
  }

  send(raw) {
    const message = JSON.parse(raw);
    this.messages.push(message);
    if (message.method === 'initialize') {
      queueMicrotask(() => this.receive(JSON.stringify({
        jsonrpc: '2.0',
        id: message.id,
        result: { capabilities: { completionProvider: {}, documentFormattingProvider: true } }
      })));
    } else if (message.method === 'textDocument/completion') {
      queueMicrotask(() => this.receive(JSON.stringify({
        jsonrpc: '2.0',
        id: message.id,
        result: []
      })));
    } else if (message.method === 'textDocument/formatting') {
      queueMicrotask(() => this.receive(JSON.stringify({
        jsonrpc: '2.0',
        id: message.id,
        result: this.formattingEdits
      })));
    }
  }
}

describe('language server integration', function() {
  let transport;
  let view;

  function messages(method) {
    return transport.messages.filter(message => message.method === method);
  }

  async function createEditor(synchronizationMethod) {
    transport = new TestTransport();
    view = new EditorView({
      state: EditorState.create({
        doc: 'abc',
        extensions: languageServerWithTransport({
          transport,
          rootUri: null,
          workspaceFolders: null,
          documentUri: 'file:///test',
          languageId: 'test',
          prefix: 'context\nxx',
          suffix: '\nend',
          synchronizationMethod
        })
      }),
      parent: document.body
    });

    describe('properties panel language server popup', function() {
      let webSocket;

      beforeEach(function() {
        class FakeWebSocket extends EventTarget {
          static OPEN = 1;
          readyState = 0;
          close() {}
        }

        webSocket = stub(window, 'WebSocket').callsFake(() => new FakeWebSocket());
        webSocket.OPEN = FakeWebSocket.OPEN;
      });

      afterEach(function() {
        cleanup();
        webSocket.restore();
      });

      it('opens and closes the LSP popup in the configured container', async function() {
        const eventBus = new EventBus();
        const popupContainer = document.createElement('div');
        document.body.appendChild(popupContainer);

        try {
          render(<PropertiesPanel
            element={ { id: 'test' } }
            groups={ [] }
            eventBus={ eventBus }
            lspPopupContainer={ popupContainer } />);

          await act(() => eventBus.fire('lspPopup._open', {
            entryId: 'entry',
            popupConfig: {
              id: 'entry',
              title: 'Expression',
              value: 'abc',
              languageId: 'test',
              serverUri: 'ws://localhost:1234',
              onInput: () => {}
            }
          }));

          expect(popupContainer.querySelector('.cm-editor')).to.exist;

          await act(() => eventBus.fire('lspPopup._close'));
          expect(popupContainer.querySelector('.cm-editor')).to.not.exist;
        } finally {
          popupContainer.remove();
        }
      });
    });
    await waitFor(() => expect(messages('textDocument/didOpen')).to.have.length(1));
  }

  afterEach(function() {
    view?.destroy();
  });

  it('sends virtual document text and maps completion positions', async function() {
    await createEditor();

    expect(messages('textDocument/didOpen')[0].params.textDocument.text)
      .to.equal('context\nxxabc\nend');

    view.dispatch({ changes: { from: 3, insert: 'd' } });
    await waitFor(() => expect(messages('textDocument/didChange')).to.have.length(1));
    expect(messages('textDocument/didChange')[0].params.contentChanges)
      .to.deep.equal([ { text: 'context\nxxabcd\nend' } ]);

    view.dispatch({ selection: { anchor: 2 } });
    startCompletion(view);
    await waitFor(() => expect(messages('textDocument/completion')).to.have.length(1));
    expect(messages('textDocument/completion')[0].params.position)
      .to.deep.equal({ line: 1, character: 4 });

    transport.receive(JSON.stringify({
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: {
        uri: 'file:///test',
        diagnostics: [ {
          range: {
            start: { line: 1, character: 3 },
            end: { line: 1, character: 4 }
          },
          severity: 1,
          message: 'problem'
        } ]
      }
    }));
    const diagnostics = [];
    forEachDiagnostic(view.state, (diagnostic, from, to) => diagnostics.push({ from, to }));
    expect(diagnostics).to.deep.equal([ { from: 1, to: 2 } ]);
  });

  it('maps incremental edits into the virtual document', async function() {
    await createEditor(SynchronizationMethod.Incremental);
    view.dispatch({ changes: { from: 1, to: 2, insert: 'X' } });

    await waitFor(() => expect(messages('textDocument/didChange')).to.have.length(1));
    expect(messages('textDocument/didChange')[0].params.contentChanges)
      .to.deep.equal([ {
        range: {
          start: { line: 1, character: 3 },
          end: { line: 1, character: 4 }
        },
        text: 'X'
      } ]);
  });

  it('highlights null values in language-server editors', function() {
    view = new EditorView({
      state: EditorState.create({
        doc: 'null',
        extensions: [ json(), syntaxClasses ]
      }),
      parent: document.body
    });

    expect(view.dom.querySelector('.null')?.textContent).to.equal('null');
  });

  it('rejects formatting edits that would replace hidden context', async function() {
    await createEditor();
    transport.formattingEdits = [ {
      range: {
        start: { line: 0, character: 0 },
        end: { line: 2, character: 3 }
      },
      newText: 'replacement'
    } ];
    const error = stub(console, 'error');
    try {
      expect(formatDocument(view)).to.be.true;
      await waitFor(() => expect(error.calledOnce).to.be.true);
      expect(view.state.doc.toString()).to.equal('abc');
    } finally {
      error.restore();
    }
  });
});
