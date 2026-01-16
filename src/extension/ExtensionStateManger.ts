import * as vscode from "vscode";

import { COLLECTION } from "./constants";
import { IUserRequestSidebarState } from "./utils/type";

class ExtentionStateManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  getExtensionContext(state: string) {
    const userRequestHistory: IUserRequestSidebarState[] | undefined =
      this.context.globalState.get(state);

    return {
      userRequestHistory: userRequestHistory || [],
    };
  }

  hasExtensionContext(state: string): boolean {
    const data = this.context.globalState.get(state);
    return !!data && Array.isArray(data) && data.length > 0;
  }

  async addExtensionContext(
    state: string,
    { history }: { history: IUserRequestSidebarState[] },
  ) {
    await this.context.globalState.update(state, history);
  }

  async deleteExtensionContext(targetExtensionContext: string, id?: string) {
    const targetGlobalState: IUserRequestSidebarState[] | undefined =
      this.context.globalState.get(targetExtensionContext);

    if (!targetGlobalState) return;

    if (!id) {
      await this.context.globalState.update(targetExtensionContext, []);
    } else {
      const filteredExtenionContext = targetGlobalState.filter(
        (history) => history.id !== id,
      );

      await this.context.globalState.update(targetExtensionContext, [
        ...filteredExtenionContext,
      ]);
    }
  }
}

export default ExtentionStateManager;
