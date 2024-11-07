import {
  createContext
} from 'preact';

const LspPopupContext = createContext({
  open: () => {},
  close: () => {},
  source: null
});

export default LspPopupContext;