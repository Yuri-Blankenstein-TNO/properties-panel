export default class LspPopupModule {

  constructor(eventBus) {
    this._eventBus = eventBus;
  }

  /**
   * Check if the LSP popup is open.
   * @return {Boolean}
   */
  isOpen() {
    return this._eventBus.fire('feelPopup._isOpen');
  }

  /**
   * Open the LSP popup.
   *
   * @param {String} entryId
   * @param {Object} popupConfig
   * @param {HTMLElement} sourceElement
   */
  open(entryId, popupConfig, sourceElement) {
    return this._eventBus.fire('lspPopup._open', {
      entryId,
      popupConfig,
      sourceElement
    });
  }

  /**
   * Close the FEEL popup.
   */
  close() {
    return this._eventBus.fire('lspPopup._close');
  }
}

LspPopupModule.$inject = [ 'eventBus' ];