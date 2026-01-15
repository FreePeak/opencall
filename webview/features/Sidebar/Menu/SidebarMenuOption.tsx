import React from "react";
import { shallow } from "zustand/shallow";

import { REQUEST, SIDEBAR } from "../../../constants";
import useStore from "../../../store/useStore";
import SidebarCollection from "../Collection/SidebarCollection";

import { ISidebarSliceList } from "../../../store/slices/type";

const SidebarMenuOption = () => {
  const {
    sidebarOption,
    userRequestHistory,
    userCollections,
    handleUserDeleteIcon,
  } = useStore(
    (state) => ({
      sidebarOption: state.sidebarOption,
      userRequestHistory: state.userRequestHistory,
      userCollections: state.userCollections,
      handleUserDeleteIcon: state.handleUserDeleteIcon,
    }),
    shallow,
  );

  const sidebarCollectionProps = {
    sidebarOption,
    handleDeleteButton(id: string) {
      handleUserDeleteIcon(
        SIDEBAR.USER_REQUEST_HISTORY_COLLECTION as keyof ISidebarSliceList,
        id,
      );

      return vscode.postMessage({
        command: SIDEBAR.DELETE,
        id,
        target: SIDEBAR.USER_REQUEST_HISTORY_COLLECTION,
      });
    },
    handleDeleteAllButton() {
      return vscode.postMessage({
        command: SIDEBAR.DELETE_ALL_COLLECTION,
        target: SIDEBAR.USER_REQUEST_HISTORY_COLLECTION,
      });
    },
    handleUrlClick(id: string) {
      return vscode.postMessage({
        command: REQUEST.URL_REQUEST,
        id,
        target: SIDEBAR.USER_REQUEST_HISTORY_COLLECTION,
      });
    },
  };

  switch (sidebarOption) {
    case SIDEBAR.COLLECTIONS:
      return (
        <SidebarCollection
          userCollection={userCollections}
          {...sidebarCollectionProps}
        />
      );
    default:
      return (
        <SidebarCollection
          userCollection={userRequestHistory}
          {...sidebarCollectionProps}
        />
      );
  }
};

export default SidebarMenuOption;
