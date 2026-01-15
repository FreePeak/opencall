import React, { useLayoutEffect, MouseEvent } from "react";
import styled from "styled-components";
import { shallow } from "zustand/shallow";

import MenuOption from "../../../components/MenuOption";
import SelectWrapper from "../../../components/SelectWrapper";
import { OPTION, SIDEBAR } from "../../../constants";
import useStore from "../../../store/useStore";
import SidebarMenuOption from "./SidebarMenuOption";

type OnClickCallback = (event: MouseEvent<HTMLHeadingElement>) => void;

const SidebarMenu = () => {
  const {
    sidebarOption,
    deleteCollection,
    handleSidebarOption,
    handleUserHistoryCollection,
    handleUserCollections,
  } = useStore(
    (state) => ({
      sidebarOption: state.sidebarOption,
      deleteCollection: state.deleteCollection,
      handleSidebarOption: state.handleSidebarOption,
      handleUserHistoryCollection: state.handleUserHistoryCollection,
      handleUserCollections: state.handleUserCollections,
    }),
    shallow,
  );

  const handleHeadingTextClick: OnClickCallback = (
    event: MouseEvent<HTMLHeadingElement>,
  ) => {
    const clickedHeading = event.currentTarget;

    handleSidebarOption(clickedHeading.innerText);
  };

  useLayoutEffect(() => {
    window.addEventListener("message", (message) => {
      console.log('Sidebar received message:', message.data);
      const { messageCategory, history, collections, target } = message.data;

      if (messageCategory === SIDEBAR.COLLECTION_DATA) {
        console.log('Processing collection data:', { history, collections });
        handleUserHistoryCollection(history?.userRequestHistory);
        handleUserCollections(collections || []);
      } else if (messageCategory === SIDEBAR.DELETE_COMPLETE) {
        deleteCollection(target);
      }
    });
  }, []);

  return (
    <>
      <SidebarMenuWrapper>
        <SelectWrapper secondary>
          {OPTION.SIDEBAR_MENU_OPTIONS.map((option, index) => (
            <MenuOption
              key={index}
              currentOption={sidebarOption}
              menuOption={option}
            >
              <h3 onClick={handleHeadingTextClick}>{option}</h3>
            </MenuOption>
          ))}
        </SelectWrapper>
      </SidebarMenuWrapper>
      <SidebarMenuOption />
    </>
  );
};

const SidebarMenuWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2.5rem;
  padding-bottom: 0.7rem;
  border-bottom: 0.07rem dashed var(--vscode-panel-border, #808080);

  h3 {
    font-size: 1.25rem;
    font-weight: 200;
  }
`;

export default SidebarMenu;
