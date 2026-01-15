import React from "react";
import { shallow } from "zustand/shallow";

import { REQUEST, SIDEBAR } from "../../../constants";
import useStore from "../../../store/useStore";
import SidebarCollection from "../Collection/SidebarCollection";
import SidebarCollectionTree from "../Collection/SidebarCollectionTree";

import { ISidebarSliceList } from "../../../store/slices/type";

const SidebarMenuOption = () => {
  const {
    sidebarOption,
    userRequestHistory,
    userCollections,
    handleUserDeleteIcon,
    handleUserFavoriteIcon,
  } = useStore(
    (state) => ({
      sidebarOption: state.sidebarOption,
      userRequestHistory: state.userRequestHistory,
      userCollections: state.userCollections,
      handleUserDeleteIcon: state.handleUserDeleteIcon,
      handleUserFavoriteIcon: state.handleUserFavoriteIcon,
    }),
    shallow,
  );

  const sidebarCollectionProps = {
    sidebarOption,
    handleSidebarFavoriteIcon(command: string, id: string) {
      const currentTime = new Date().getTime();

      if (command === SIDEBAR.ADD_TO_FAVORITES) {
        vscode.postMessage({ command, id });
        handleUserFavoriteIcon(id, currentTime);
      } else if (command === SIDEBAR.REMOVE_FROM_FAVORITES) {
        vscode.postMessage({ command, id });
        handleUserFavoriteIcon(id, null);
      }
    },
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
        <SidebarCollectionTree
          collections={userCollections}
          onItemClick={(item) => {
            if (item.method && item.url) {
              vscode.postMessage({
                command: REQUEST.URL_REQUEST,
                id: item.id,
                target: "collections",
              });
            }
          }}
          onDeleteItem={(item) => {
            vscode.postMessage({
              command: SIDEBAR.DELETE,
              id: item.id,
              target: "collections",
            });
          }}
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
