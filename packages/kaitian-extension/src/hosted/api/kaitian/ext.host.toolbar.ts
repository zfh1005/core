import { IExtHostCommands } from '../../../common/vscode';
import { ExtHostCommon } from './ext.host.common';
import { IExtension } from '../../../common';
import { IToolbarButtonActionHandle, IToolbarSelectActionHandle } from '../../../common/kaitian/toolbar';
import { Emitter, Disposable } from '@ali/ide-core-common';

export function createToolbarAPIFactory(
  extension: IExtension,
  service: ExtHostToolbarActionService,
) {
  return {
    getToolbarActionButtonHandle: async (id) => {
      return service.getToolbarButtonActionHandle(id, extension.id);
    },
    getToolbarActionSelectHandle: async (id) => {
      return service.getToolbarSelectActionHandle(id, extension.id);
    },
  };
}

export class ExtHostToolbarActionService {

  private btnHandles = new Map<string, Promise<ToolbarBtnActionHandleController>>();

  private selectHandles = new Map<string, Promise<ToolbarSelectActionHandleController<any>>>();

  constructor(private extHostCommands: IExtHostCommands, private kaitianCommon: ExtHostCommon) {

  }

  getToolbarButtonActionHandle(id: string, extensionId: string): Promise<IToolbarButtonActionHandle> {
    const compositeKey = extensionId + '.' + id;
    if (!this.btnHandles.has(compositeKey)) {
      const promise = new Promise<ToolbarBtnActionHandleController>(async (resolve, reject) => {
        const h = new ToolbarBtnActionHandleController(compositeKey, this.extHostCommands, this.kaitianCommon);
        try {
          await h.init();
          resolve(h);
        } catch (e) {
          reject(e);
        }
      });
      this.btnHandles.set(compositeKey, promise);
    }
    return this.btnHandles.get(compositeKey)!.then((h) => {
      return h.handle;
    });
  }

  getToolbarSelectActionHandle<T = any>(id: string, extensionId: string): Promise<IToolbarSelectActionHandle<T>> {
    const compositeKey = extensionId + '.' + id;
    if (!this.selectHandles.has(compositeKey)) {
      const promise = new Promise<ToolbarSelectActionHandleController<T>>(async (resolve, reject) => {
        const h = new ToolbarSelectActionHandleController<T>(compositeKey, this.extHostCommands, this.kaitianCommon);
        try {
          await h.init();
          resolve(h);
        } catch (e) {
          reject(e);
        }
      });
      this.selectHandles.set(compositeKey, promise);
    }
    return this.selectHandles.get(compositeKey)!.then((h) => {
      return h.handle;
    });
  }
}

export class ToolbarBtnActionHandleController extends Disposable {

  private _handle: IToolbarButtonActionHandle;

  private _onClick = new Emitter<void>();

  private _onStateChange = new Emitter<{from: string, to: string}>();

  constructor(public readonly id: string, private extHostCommands: IExtHostCommands, private kaitianCommon: ExtHostCommon) {
    super();
  }

  get handle(): IToolbarButtonActionHandle {
    if (!this._handle) {
      this._handle = {
        onClick: this._onClick.event,
        onStateChanged: this._onStateChange.event,
        setState: (state, title?: string) => {
          return this.extHostCommands.executeCommand<void>('kaitian-extension.toolbar.btn.setState', this.id, state, title);
        },
        showPopover: async () => {
          // TODO: popover能力
          // return this.extHostCommands.executeCommand<void>('kaitian-extension.toolbar.showPopover', this.id);
        },
      };
    }
    return this._handle;
  }

  async init() {
    this.addDispose(this.kaitianCommon.onEvent('kaitian-extension.toolbar.btn.click', (id) => {
      if (id === this.id) {
        this._onClick.fire();
      }
    }));
    this.addDispose(this.kaitianCommon.onEvent('kaitian-extension.toolbar.btn.stateChange', (id, from, to) => {
      if (id === this.id) {
        this._onStateChange.fire({from, to});
      }
    }));
    return this.extHostCommands.executeCommand('kaitian-extension.toolbar.btn.connectHandle', this.id);
  }
}

export class ToolbarSelectActionHandleController<T> extends Disposable {

  private _handle: IToolbarSelectActionHandle<T>;

  private _onSelect = new Emitter<T>();

  private _onStateChange = new Emitter<{from: string, to: string}>();

  private _value: T;

  constructor(public readonly id: string, private extHostCommands: IExtHostCommands, private kaitianCommon: ExtHostCommon) {
    super();
  }

  get handle(): IToolbarSelectActionHandle<T> {
    if (!this._handle) {
      this._handle = {
        onSelect: this._onSelect.event,
        onStateChanged: this._onStateChange.event,
        setState: (state, title?: string) => {
          return this.extHostCommands.executeCommand<void>('kaitian-extension.toolbar.select.setState', this.id, state, title);
        },
        setOptions: (options: any, iconBasePath?: string) => {
          return this.extHostCommands.executeCommand<void>('kaitian-extension.toolbar.select.setOptions', this.id, iconBasePath, options);
        },
        setSelect: (value: T) => {
          return this.extHostCommands.executeCommand<void>('kaitian-extension.toolbar.select.setSelect', this.id, value);
        },
        getValue: () => {
          return this._value;
        },
      };
    }
    return this._handle;
  }

  async init() {
    this.addDispose(this.kaitianCommon.onEvent('kaitian-extension.toolbar.select.onSelect', (id, value) => {
      if (id === this.id) {
        this._onSelect.fire(value);
      }
    }));
    this.addDispose(this.kaitianCommon.onEvent('kaitian-extension.toolbar.select.stateChange', (id, from, to) => {
      if (id === this.id) {
        this._onStateChange.fire({from, to});
      }
    }));
    this._value =  await this.extHostCommands.executeCommand('kaitian-extension.toolbar.select.connectHandle', this.id) as T;
  }

}