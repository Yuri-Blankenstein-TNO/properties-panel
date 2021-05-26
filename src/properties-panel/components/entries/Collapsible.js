import {
  useState
} from 'preact/hooks';

import classnames from 'classnames';

import {
  ListArrowIcon,
  ListDeleteIcon,
} from '../icons';


export default function CollapsibleEntry(props) {
  const {
    id,
    entries = [],
    label,
    remove: RemoveContainer,
    open: shouldOpen
  } = props;

  const [ open, setOpen ] = useState(shouldOpen);

  const toggleOpen = () => setOpen(!open);

  return (
    <div
      data-entry-id={ id }
      class={ classnames(
        'bio-properties-panel-collapsible-entry',
        open ? 'open' : ''
      ) }>
      <div class="bio-properties-panel-collapsible-entry-header" onClick={ toggleOpen }>
        <div class="bio-properties-panel-collapsible-entry-header-title">
          { label }
        </div>
        <div class="bio-properties-panel-collapsible-entry-arrow">
          <ListArrowIcon class={ open ? 'bio-properties-panel-arrow-down' : 'bio-properties-panel-arrow-right' } />
        </div>
        <RemoveContainer>
          <ListDeleteIcon class="bio-properties-panel-remove-entry" />
        </RemoveContainer>
      </div>
      <div class={ classnames(
        'bio-properties-panel-collapsible-entry-entries',
        open ? 'open' : ''
      ) }>
        {
          entries.map(e => e.component)
        }
      </div>
    </div>
  );
}