import React from "react";

const Loader: React.FC = () => (
  <div className="flex justify-center items-center min-h-screen w-full">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary"></div>
  </div>
);

export default Loader;

