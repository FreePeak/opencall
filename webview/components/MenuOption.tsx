import React from "react";
import styled from "styled-components";
import { TMenuOptionProps } from "./type";

const MenuOption = ({
  children,
  currentOption,
  menuOption,
}: TMenuOptionProps) => {
  return (
    <MenuOptionWrapper primary={currentOption === menuOption}>
      {children}
    </MenuOptionWrapper>
  );
};

const MenuOptionWrapper = styled.div<{ primary: boolean }>`
  display: flex;
  align-items: center;
  margin: 0 1rem;
  padding-bottom: 0.35rem;
  border-bottom: ${(props) =>
    props.primary ? "0.15rem solid var(--vscode-focusBorder, #007acc)" : "none"};
  opacity: ${(props) => (props.primary ? "1" : "0.65")};

  h3 {
    font-weight: 400;
    cursor: pointer;
  }
`;

export default MenuOption;
