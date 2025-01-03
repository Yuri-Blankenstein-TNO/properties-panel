import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

export const baseTheme = EditorView.theme({
  '& .cm-content': {
    padding: '0px',
  },
  '& .cm-line': {
    padding: '0px',
  },
  '&.cm-editor.cm-focused': {
    outline: 'none',
  },
  '& .cm-completionInfo': {
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  '&.cm-editor': {
    height: '100%',
  },

  // Don't wrap whitespace for custom HTML
  '& .cm-completionInfo > *': {
    whiteSpace: 'normal'
  },
  '& .cm-completionInfo ul': {
    margin: 0,
    paddingLeft: '15px'
  },
  '& .cm-completionInfo pre': {
    marginBottom: 0,
    whiteSpace: 'pre-wrap'
  },
  '& .cm-completionInfo p': {
    marginTop: 0,
  },
  '& .cm-completionInfo p:not(:last-of-type)': {
    marginBottom: 0,
  }
});

export const highlightTheme = EditorView.baseTheme({
  '& .variableName': {
    color: '#10f'
  },
  '& .number': {
    color: '#164'
  },
  '& .string': {
    color: '#a11'
  },
  '& .bool': {
    color: '#219'
  },
  '& .function': {
    color: '#aa3731',
    fontWeight: 'bold'
  },
  '& .control': {
    color: '#708'
  },
  '& .comment': {
    color: '#797'
  },
  '& .invalid': {
    color: '#f00',
    fontWeight: 'bold'
  }
});

export const syntaxClasses = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.variableName, class: 'variableName' },
    { tag: t.name, class: 'variableName' },
    { tag: t.number, class: 'number' },
    { tag: t.string, class: 'string' },
    { tag: t.bool, class: 'bool' },
    { tag: t.function(t.variableName), class: 'function' },
    { tag: t.function(t.special(t.variableName)), class: 'function' },
    { tag: t.controlKeyword, class: 'control' },
    { tag: t.definitionKeyword, class: 'control' },
    { tag: t.moduleKeyword, class: 'control' },
    { tag: t.operatorKeyword, class: 'control' },
    { tag: t.blockComment, class: 'comment' },
    { tag: t.lineComment, class: 'comment' },
    { tag: t.invalid, class: 'invalid' }
  ])
);