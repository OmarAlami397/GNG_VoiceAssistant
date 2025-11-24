import React, { useState } from "react";
import PlaylistTable from "./PlaylistTable.jsx";

export default function EditPage() {
  return (
    <div className="Enter">
      <h1>Edit Commands</h1>
      <p>All recorded commands:</p>
      <PlaylistTable />
    </div>
  );
}