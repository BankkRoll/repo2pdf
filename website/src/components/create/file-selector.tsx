// src/components/create/file-selector.tsx

import {
  CheckboxState,
  ItemState,
  Tree,
  updateItemStates,
} from "@/components/create/file-tree";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileSelectionDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  repoFiles: any[];
  selectedFiles: Set<string>;
  handleFileSelection: (filePath: string) => void;
}

const FileSelectionDialog: React.FC<FileSelectionDialogProps> = ({
  dialogOpen,
  setDialogOpen,
  repoFiles,
  selectedFiles,
  handleFileSelection,
}) => {
  const [itemStates, setItemStates] = useState<ItemState[]>(
    repoFiles.map((file) => ({ id: file.id, state: CheckboxState.UNCHECKED })),
  );

  const getStateForId = useCallback(
    (id: number) => {
      return (
        itemStates.find((i) => i.id === id)?.state ?? CheckboxState.UNCHECKED
      );
    },
    [itemStates],
  );

  const clickHandler = useCallback(
    (id: number) => {
      setItemStates(updateItemStates(itemStates, repoFiles, id));
      handleFileSelection(id.toString());
    },
    [itemStates, repoFiles, handleFileSelection],
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <div className="w-full my-4">
          <Button>Select Files ({selectedFiles.size})</Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <ScrollArea className="max-h-[60svh]">
          <DialogHeader>
            <DialogTitle>Select Files</DialogTitle>
          </DialogHeader>
          <Tree
            data={repoFiles}
            getStateForId={getStateForId}
            onClick={clickHandler}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FileSelectionDialog;
