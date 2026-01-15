import { StateCreator } from "zustand";
import { SIDEBAR } from "../../constants";
import {
  ISidebarSlice,
  IUserRequestSidebarState,
  ISidebarSliceList,
  CollectionSearchFilters,
} from "./type";

const sidebarSlice: StateCreator<ISidebarSlice, [], [], ISidebarSlice> = (
  set,
) => ({
  userRequestHistory: [],
  userCollections: [],
  sidebarOption: SIDEBAR.COLLECTIONS,
  collectionFilters: {},
  selectedItems: [],

  handleSidebarOption: (option: string) =>
    set(() => ({ sidebarOption: option })),

  handleUserHistoryCollection: (historyData: IUserRequestSidebarState[]) =>
    set(() => ({ userRequestHistory: historyData })),

  handleUserCollections: (collectionsData: any[]) =>
    set(() => ({ userCollections: collectionsData })),

  setCollectionFilters: (filters: CollectionSearchFilters) =>
    set(() => ({ collectionFilters: filters })),

  setSelectedItems: (items: string[]) =>
    set(() => ({ selectedItems: items })),

  toggleItemSelection: (id: string) =>
    set((state) => ({
      selectedItems: state.selectedItems.includes(id)
        ? state.selectedItems.filter((itemId) => itemId !== id)
        : [...state.selectedItems, id],
    })),

  clearSelection: () =>
    set(() => ({ selectedItems: [] })),

  handleUserFavoriteIcon: (id: string, time: number | null) =>
    set((state) => ({
      userRequestHistory: state.userRequestHistory.map((historyData) =>
        historyData.id === id
          ? {
              ...historyData,
              isUserFavorite: !historyData.isUserFavorite,
              favoritedTime: time,
            }
          : historyData,
      ),
    })),

  handleUserDeleteIcon: (targetState: keyof ISidebarSliceList, id: string) => {
    set((state) => ({
      [targetState]: state[targetState].filter(
        (historyData) => historyData.id !== id,
      ),
    }));
  },

  resetFavoriteIconState: () =>
    set((state) => ({
      userRequestHistory: state.userRequestHistory.map((historyData) =>
        historyData.isUserFavorite === true
          ? { ...historyData, isUserFavorite: false }
          : historyData,
      ),
    })),

  deleteCollection: (targetState: string) => {
    set(() => ({ [targetState]: [] }));
  },
});

export default sidebarSlice;
