import React, { useState } from "react";
import { FaFolder, FaFolderOpen, FaFileAlt } from "react-icons/fa";
import { FaTrashAlt } from "react-icons/fa";
import styled from "styled-components";

import Message from "../../../components/Message";
import { generateMethodColor } from "../../../utils";

interface CollectionItem {
  id: string;
  name: string;
  description?: string;
  type?: 'collection' | 'folder';
  method?: string;
  url?: string;
  items?: CollectionItem[];
}

interface ISidebarCollectionTreeProps {
  collections: CollectionItem[];
  onItemClick?: (item: CollectionItem) => void;
  onDeleteItem?: (item: CollectionItem) => void;
}

const CollectionTreeItem = ({
  item,
  level = 0,
  onItemClick,
  onDeleteItem,
}: {
  item: CollectionItem;
  level?: number;
  onItemClick?: (item: CollectionItem) => void;
  onDeleteItem?: (item: CollectionItem) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = item.items && item.items.length > 0;
  const isRequest = item.method && item.url;

  const handleClick = () => {
    if (isRequest && onItemClick) {
      onItemClick(item);
    } else if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const methodColor = item.method ? generateMethodColor(item.method.toLowerCase()) : undefined;

  return (
    <TreeItemWrapper>
      <TreeItemRow level={level} onClick={handleClick} isClickable={isRequest || hasChildren}>
        <TreeItemIcon>
          {isRequest ? (
            <MethodBadge color={methodColor}>{item.method}</MethodBadge>
          ) : hasChildren ? (
            isExpanded ? <FaFolderOpen /> : <FaFolder />
          ) : (
            <FaFolder />
          )}
        </TreeItemIcon>
        <TreeItemName isRequest={isRequest}>
          {isRequest ? item.url || item.name : item.name}
        </TreeItemName>
        {onDeleteItem && (
          <DeleteButton
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItem(item);
            }}
          >
            <FaTrashAlt />
          </DeleteButton>
        )}
      </TreeItemRow>
      {isExpanded && hasChildren && (
        <TreeChildren>
          {item.items!.map((child) => (
            <CollectionTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              onItemClick={onItemClick}
              onDeleteItem={onDeleteItem}
            />
          ))}
        </TreeChildren>
      )}
    </TreeItemWrapper>
  );
};

const SidebarCollectionTree = ({
  collections,
  onItemClick,
  onDeleteItem,
}: ISidebarCollectionTreeProps) => {
  const [searchInputValue, setSearchInputValue] = useState("");

  const filterCollections = (items: CollectionItem[], query: string): CollectionItem[] => {
    if (!query) return items;
    return items.filter((item) => {
      const nameMatch = item.name?.toLowerCase().includes(query.toLowerCase());
      const urlMatch = item.url?.toLowerCase().includes(query.toLowerCase());
      const hasMatchingChildren = item.items && filterCollections(item.items, query).length > 0;
      return nameMatch || urlMatch || hasMatchingChildren;
    });
  };

  const filteredCollections = filterCollections(collections || [], searchInputValue);

  if (!collections || collections.length === 0) {
    return (
      <Message>
        <p>No collections yet. Create a collection to organize your requests.</p>
      </Message>
    );
  }

  return (
    <>
      <SearchWrapper>
        <input
          type="text"
          placeholder="Search collections..."
          value={searchInputValue}
          onChange={(event) => setSearchInputValue(event.target.value)}
        />
      </SearchWrapper>
      <CollectionTreeWrapper>
        {filteredCollections.length > 0 ? (
          filteredCollections.map((collection) => (
            <CollectionTreeItem
              key={collection.id}
              item={collection}
              onItemClick={onItemClick}
              onDeleteItem={onDeleteItem}
            />
          ))
        ) : (
          <Message>
            <p>No collections match your search.</p>
          </Message>
        )}
      </CollectionTreeWrapper>
    </>
  );
};

const SearchWrapper = styled.div`
  padding: 0.5rem 1rem;
  
  input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--vscode-input-border, #3c3c3c);
    background: var(--vscode-input-background, #1e1e1e);
    color: var(--vscode-input-foreground, #cccccc);
    border-radius: 4px;
    font-size: 0.875rem;
    
    &:focus {
      outline: none;
      border-color: var(--vscode-focusBorder, #007acc);
    }
  }
`;

const CollectionTreeWrapper = styled.div`
  padding: 0.5rem 0;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
`;

const TreeItemWrapper = styled.div``;

const TreeItemRow = styled.div<{ level: number; isClickable: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.4rem 0.5rem;
  padding-left: ${(props) => 0.5 + props.level * 1}rem;
  cursor: ${(props) => (props.isClickable ? "pointer" : "default")};
  gap: 0.5rem;
  
  &:hover {
    background: var(--vscode-list-hoverBackground, #2a2d2e);
    
    button {
      opacity: 1;
    }
  }
`;

const TreeItemIcon = styled.span`
  display: flex;
  align-items: center;
  color: var(--vscode-foreground, #cccccc);
  font-size: 0.875rem;
`;

const MethodBadge = styled.span<{ color?: string }>`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${(props) => props.color || "#cccccc"};
  min-width: 3rem;
`;

const TreeItemName = styled.span<{ isRequest?: boolean }>`
  flex: 1;
  font-size: 0.8rem;
  color: var(--vscode-foreground, #cccccc);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TreeChildren = styled.div``;

const DeleteButton = styled.button`
  background: none;
  border: none;
  color: var(--vscode-errorForeground, #f48771);
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s;
  
  &:hover {
    color: var(--vscode-errorForeground, #ff0000);
  }
`;

export default SidebarCollectionTree;
