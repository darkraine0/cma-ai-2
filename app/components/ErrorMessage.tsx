import React from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <Card className="">
    <CardContent className="pt-6">
      <div className="text-center">
        <Badge variant="destructive" className="mb-4">
          Error
        </Badge>
        <p className="text-destructive font-semibold text-lg">{message}</p>
      </div>
    </CardContent>
  </Card>
);

export default ErrorMessage;

