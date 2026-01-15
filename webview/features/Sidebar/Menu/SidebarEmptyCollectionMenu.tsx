import React from "react";

import Message from "../../../components/Message";
import { SIDEBAR } from "../../../constants";
import EmptyFavoritesCollectionMessage from "../Message/EmptyFavoritesCollectionMessage";
import EmptyHistoryCollectionMessage from "../Message/EmptyHistoryCollectionMessage";

interface ISibebarEmptyCollectionMenuProps {
  currentSidebarOption: string | null;
}

const SibebarEmptyCollectionMenu = ({
  currentSidebarOption,
}: ISibebarEmptyCollectionMenuProps) => {
  return (
    <Message>
      {currentSidebarOption === SIDEBAR.HISTORY ? (
        <EmptyHistoryCollectionMessage />
      ) : currentSidebarOption === SIDEBAR.COLLECTIONS ? (
        <p>No collections yet. Create a collection to organize your requests.</p>
      ) : (
        <EmptyFavoritesCollectionMessage />
      )}
    </Message>
  );
};

export default SibebarEmptyCollectionMenu;
