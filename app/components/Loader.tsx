import React from "react";
import { Card, CardContent } from "./ui/card";

const Loader: React.FC = () => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-primary border-b-4 border-accent"></div>
        <span className="ml-4 text-primary font-semibold text-lg">Loading...</span>
      </div>
    </CardContent>
  </Card>
);

export default Loader;

