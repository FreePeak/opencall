import { IUserRequestSidebarState } from "./type";

// This function was used for favorites functionality which has been removed.
// Keeping as placeholder for potential future use.
const filterDuplicatesFromObject = (
  currentCollection: IUserRequestSidebarState[],
  previousCollection: IUserRequestSidebarState[],
  id: string,
) => {
  const arr: string[] = [];

  const filteredPreviousCollection =
    previousCollection?.filter((history) => history.id !== id) || [];

  const combinedCollection = [
    ...currentCollection,
    ...filteredPreviousCollection,
  ];

  const duplicateFilteredCollection = combinedCollection.filter((history) => {
    if (!arr.includes(history.id)) {
      arr.push(history.id);
      return history;
    }
  });

  return duplicateFilteredCollection;
};

export default filterDuplicatesFromObject;
