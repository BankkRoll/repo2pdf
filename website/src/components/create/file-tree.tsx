// src/components/create/file-tree.tsx

import { Fragment, useCallback, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Minus } from "lucide-react";

export enum CheckboxState {
  UNCHECKED,
  CHECKED,
  INDETERMINATE,
}

export type ItemState = {
  id: number;
  state: CheckboxState;
};

export type Item = {
  id: number;
  name: string;
  parentId: number;
};

type CheckboxListProps = {
  items: Item[];
  idsToRender?: number[];
  indentLevel?: number;
  onClick?: (id: number) => void;
  getStateForId: (id: number) => CheckboxState;
};

export const updateItemStates = (
  oldState: ItemState[],
  items: Item[],
  clickedId: number,
) => {
  const newState = oldState.map((i) => ({ ...i }));

  const getItemState = (id: number) => {
    return newState.find((i) => i.id === id)!.state;
  };

  const updateParent = (id: number) => {
    const item = items.find((i) => i.id === id);
    const parent = items.find((i) => i.id === item!.parentId);
    if (!parent) return;
    const childIds = items
      .filter((i) => i.parentId === parent.id)
      .map((i) => i.id);
    const childStates = childIds.map((childId) => getItemState(childId));
    if (childStates.every((state) => state === CheckboxState.CHECKED)) {
      newState.find((i) => i.id === parent.id)!.state = CheckboxState.CHECKED;
    } else if (
      childStates.every((state) => state === CheckboxState.UNCHECKED)
    ) {
      newState.find((i) => i.id === parent.id)!.state = CheckboxState.UNCHECKED;
    } else {
      newState.find((i) => i.id === parent.id)!.state =
        CheckboxState.INDETERMINATE;
    }
    updateParent(parent.id);
  };

  const setUnchecked = (id: number) => {
    newState.find((i) => i.id === id)!.state = CheckboxState.UNCHECKED;
    items
      .filter((i) => i.parentId === id)
      .forEach((child) => setUnchecked(child.id));
    updateParent(id);
  };

  const setChecked = (id: number) => {
    newState.find((i) => i.id === id)!.state = CheckboxState.CHECKED;
    items
      .filter((i) => i.parentId === id)
      .forEach((child) => setChecked(child.id));
    updateParent(id);
  };

  const itemState = getItemState(clickedId);
  if (itemState === CheckboxState.CHECKED) {
    setUnchecked(clickedId);
  } else {
    setChecked(clickedId);
  }
  return newState;
};

function CheckboxList({
  items,
  getStateForId,
  idsToRender = [],
  indentLevel = 0,
  onClick = () => {},
}: CheckboxListProps) {
  if (!idsToRender.length) {
    idsToRender = items.filter((i) => !i.parentId).map((i) => i.id);
  }

  const getChildNodes = (parentId: number) => {
    const nodeItems = items.filter((i) => i.parentId === parentId);
    if (!nodeItems.length) return null;
    return (
      <CheckboxList
        items={items}
        idsToRender={nodeItems.map((i) => i.id)}
        indentLevel={indentLevel + 1}
        onClick={onClick}
        getStateForId={getStateForId}
        key={parentId} // Ensuring unique key for each parent
      />
    );
  };

  return (
    <ul style={{ paddingLeft: indentLevel * 20 }}>
      {idsToRender.map((id) => {
        const item = items.find((i) => i.id === id);
        const checkboxState = getStateForId(id);
        const isIndeterminate = checkboxState === CheckboxState.INDETERMINATE;
        const isChecked = checkboxState === CheckboxState.CHECKED;
        return (
          <Fragment key={item!.id}>
            <li className="flex items-center gap-2 py-1">
              {isIndeterminate ? (
                <div className="w-fit rounded bg-black p-[1px]">
                  <Minus className="h-[14px] w-[14px] text-white" />
                </div>
              ) : (
                <Checkbox
                  id={String(item!.id)}
                  onClick={() => onClick(item!.id)}
                  checked={isChecked}
                />
              )}
              <label
                htmlFor={String(item!.id)}
                className="hover:cursor-pointer"
              >
                {item!.name}
              </label>
            </li>
            {getChildNodes(item!.id)}
          </Fragment>
        );
      })}
    </ul>
  );
}

function Tree({
  data,
  getStateForId,
  onClick,
}: {
  data: Item[];
  getStateForId: (id: number) => CheckboxState;
  onClick: (id: number) => void;
}) {
  const defaultItemStates: ItemState[] = data.map((i) => ({
    id: i.id,
    state: CheckboxState.UNCHECKED,
  }));

  const [itemStates, setItemStates] = useState<ItemState[]>(defaultItemStates);

  return (
    <CheckboxList
      items={data}
      onClick={onClick}
      getStateForId={getStateForId}
    />
  );
}

export { Tree, CheckboxList };
