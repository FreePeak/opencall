import React from "react";

import Message from "../../../components/Message";
import { SIDEBAR } from "../../../constants";
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
      ) : (
        <p>No collections yet. Create a collection to organize your requests.</p>
      )}
    </Message>
  );
};

export default SibebarEmptyCollectionMenu;
