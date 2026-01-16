import { StateCreator } from "zustand";
import { SIDEBAR } from "../../constants";
import {
  ISidebarSlice,
  IUserRequestSidebarState,
  ISidebarSliceList,
} from "./type";

const sidebarSlice: StateCreator<ISidebarSlice, [], [], ISidebarSlice> = (
  set,
) => ({
  userRequestHistory: [],
  userCollections: [],
  sidebarOption: SIDEBAR.HISTORY,

  handleSidebarOption: (option: string) =>
    set(() => ({ sidebarOption: option })),

  handleUserHistoryCollection: (historyData: IUserRequestSidebarState[]) =>
    set(() => ({ userRequestHistory: historyData })),

  handleUserCollections: (collectionsData: any[]) =>
    set(() => ({ userCollections: collectionsData })),

  handleUserDeleteIcon: (targetState: keyof ISidebarSliceList, id: string) => {
    set((state) => ({
      [targetState]: state[targetState].filter(
        (historyData) => historyData.id !== id,
      ),
    }));
  },

  deleteCollection: (targetState: string) => {
    set(() => ({ [targetState]: [] }));
  },
});

export default sidebarSlice;
