import * as vscode from "vscode";

import { COLLECTION } from "./constants";
import { filterDuplicatesFromObject } from "./utils";
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

  async updateExtensionContext(state: string, id: string, status?: string) {
    const globalHistoryState: IUserRequestSidebarState[] | undefined =
      this.context.globalState.get(state);

    if (!globalHistoryState) return;

    // No favorites update needed anymore
    await this.context.globalState.update(state, [...globalHistoryState]);
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
