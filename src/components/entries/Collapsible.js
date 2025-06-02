import {
  useCallback,
  useContext,
  useState
} from 'preact/hooks';

import classnames from 'classnames';

import { isFunction } from 'min-dash';

import {
  ArrowIcon,
  DeleteIcon,
} from '../icons';

import { PropertiesPanelContext } from '../../context';

import translateFallback from '../util/translateFallback';


export default function CollapsibleEntry(props) {
  const {
    element,
    entries = [],
    id,
    label,
    open: shouldOpen,
    remove,
    translate = translateFallback,
    link
  } = props;

  const [ open, setOpen ] = useState(shouldOpen);

  const toggleOpen = () => setOpen(!open && entries.length > 0);

  const { onShow } = useContext(PropertiesPanelContext);

  const propertiesPanelContext = {
    ...useContext(PropertiesPanelContext),
    onShow: useCallback(() => {
      setOpen(true);

      if (isFunction(onShow)) {
        onShow();
      }
    }, [ onShow, setOpen ])
  };


  const placeholderLabel = translate('<empty>');

  return (
    <div
      data-entry-id={ id }
      class={ classnames(
        'bio-properties-panel-collapsible-entry',
        open ? 'open' : ''
      ) }>
      <div class="bio-properties-panel-collapsible-entry-header" onClick={ link ? null : toggleOpen }>
        <div
          title={ label || placeholderLabel }
          class={ classnames(
            'bio-properties-panel-collapsible-entry-header-title',
            !label && 'empty'
          ) }>
          {
            link
              ?
              (
                <a href={ typeof link === 'function' ? 'javascript:void(0);' : link } onClick={ typeof link === 'function' ? link : undefined }>
                  {label || placeholderLabel}
                </a>
              )
              :
              (
                label || placeholderLabel
              )
          }
        </div>
        {
          entries.length > 0
            ?
            (
              <button
                type="button"
                title={ translate('Toggle list item') }
                class="bio-properties-panel-arrow  bio-properties-panel-collapsible-entry-arrow"
                onClick={ link ? toggleOpen : null }
              >
                <ArrowIcon class={ open ? 'bio-properties-panel-arrow-down' : 'bio-properties-panel-arrow-right' } />
              </button>
            )
            :
            (
              <div class="bio-properties-panel-collapsible-entry-dash"></div>
            )
        }
        {
          remove
            ?
            (
              <button type="button" title={ translate('Delete item') } class="bio-properties-panel-remove-entry" onClick={ remove }>
                <DeleteIcon />
              </button>
            )
            : null
        }
      </div>
      <div class={ classnames(
        'bio-properties-panel-collapsible-entry-entries',
        open ? 'open' : ''
      ) }>
        <PropertiesPanelContext.Provider value={ propertiesPanelContext }>
          {
            entries.map(entry => {
              const {
                component: Component,
                id
              } = entry;

              return (
                <Component
                  { ...entry }
                  element={ element }
                  key={ id } />
              );
            })
          }
        </PropertiesPanelContext.Provider>
      </div>
    </div>
  );
}