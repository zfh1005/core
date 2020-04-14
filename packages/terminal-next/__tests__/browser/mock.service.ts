import * as WebSocket from 'ws';
import { Terminal } from 'xterm';
import { uuid, URI, Emitter } from '@ali/ide-core-common';
import { Disposable } from '@ali/ide-core-browser';
import { ITerminalExternalService, ITerminalConnection } from '../../src/common';
import { port, localhost, MessageMethod } from './proxy';
import { delay } from './utils';

export const defaultPid = -1;
export const defaultName = 'Bash';

export class MockSocketService implements ITerminalExternalService {
  static resId = 1;

  private _socks: Map<string, WebSocket>;
  private _response: Map<number, { resolve: (value: any) => void }>;

  constructor() {
    this._socks = new Map();
    this._response = new Map();
  }

  makeId() {
    return uuid();
  }

  meta() {
    return '';
  }

  restore() {
    return 'term.test.restore';
  }

  getOptions() {
    return {};
  }

  intro() {
    return { name: defaultName, pid: defaultPid };
  }

  private _handleStdoutMessage(sessionId: string, handler: (json: any) => void) {
    const socket = this._socks.get(sessionId);
    if (!socket) {
      return;
    }
    socket.addEventListener('message', ({ data }) => {
      const json = JSON.parse(data) as any;
      if (!json.method) {
        handler(json.data);
      }
    });
  }

  private _custommConnection(sessionId: string): ITerminalConnection {
    return {
      onData: (handler: (json: any) => void) => {
        this._handleStdoutMessage(sessionId, handler);
        return {
          dispose: () => {},
        };
      },
      sendData: (message: string) => {
        if (!message) {
          return;
        }
        this._sendMessage(sessionId, {
          sessionId,
          data: message,
        });
      },
      pid: defaultPid,
      name: defaultName,
      readonly: false,
    };
  }

  private _sendMessage(sessionId: string, json: any) {
    const sock = this._socks.get(sessionId);
    if (!sock) {
      return;
    }
    sock.send(JSON.stringify(json));
  }

  private async _doMethod(sessionId: string, method: string, params: any) {
    return new Promise((resolve) => {
      const id = MockSocketService.resId++;
      this._sendMessage(sessionId, { id, method, params });
      if (id !== -1) {
        this._response.set(id, { resolve });
      }
    });
  }

  private _handleMethod(sessionId: string) {
    const socket = this._socks.get(sessionId);

    if (!socket) {
      return;
    }

    const handleSocketMessage = (msg: MessageEvent) => {
      const json = JSON.parse(msg.data);
      if (json.method) {
        const handler = this._response.get(json.id);
        handler && handler.resolve(json);
        this._response.delete(json.id);
      }
    };

    socket.addEventListener('message', handleSocketMessage as any);
  }

  async attach(sessionId: string, term: Terminal) {
    const sock = new WebSocket(localhost(port));
    this._socks.set(sessionId, sock);

    await delay(200);

    this._handleMethod(sessionId);

    await this._doMethod(sessionId, MessageMethod.create,
      { sessionId, cols: term.cols, rows: term.rows });

    return this._custommConnection(sessionId);
  }

  async sendText(sessionId: string, data: string) {
    this._sendMessage(sessionId, { sessionId, data });
  }

  async resize(sessionId: string, cols: number, rows: number) {
    await this._doMethod(sessionId, MessageMethod.resize, { cols, rows });
    return;
  }

  disposeById(sessionId: string) {
    const socket = this._socks.get(sessionId);

    this._doMethod(sessionId, MessageMethod.resize, { id: sessionId });

    if (socket) {
      socket.close();
    }
  }

  async getProcessId() {
    return -1;
  }

  onError() { return new Disposable(); }
}

export class MockEditorService {

}

export class MockFileService {
  getFileStat(uri: URI) {
    return Promise.resolve({});
  }
}

export class MockWorkspaceService {

}

/** Mock MainLayout Service */
export const MainLayoutTabbarOnActivate = new Emitter<any>();
export const MainLayoutTabbarOnInActivate = new Emitter<any>();

export class MockMainLayoutService {
  getTabbarHandler() {
    return {
      onActivate: MainLayoutTabbarOnActivate.event,
      onInActivate: MainLayoutTabbarOnInActivate.event,
      isActivated: () => {
        return true;
      },
    };
  }

  toggleSlot() {
    // todo
  }
}
/** End */

/** Mock Theme Service */
export const MainTerminalThemeOnThemeChange = new Emitter<any>();

export class MockThemeService {
  onThemeChange = MainTerminalThemeOnThemeChange.event;
}
/** End */

/** Mock Terminal Theme Service */
export class MockTerminalThemeService {
  get terminalTheme() {
    return {
      background: 'white',
    };
  }
}
/** End */

/** Mock Preference Service */
export class MockPreferenceService {
  get() { return undefined; }
  onPreferenceChanged() { return new Disposable(); }
}
/** End */

/** Mock Terminal Widget */
export class MockTerminalWidget {
  resize() {
    // todo
  }
}
/** End */
