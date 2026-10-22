import { useEffect, useState } from "react";
import { Collection } from "../components/Collection";
import { ICollection } from "../models/collection";
import { db } from "../models/db";
import { Navigate, useParams } from "react-router-dom";
import useLocalStorage from "../actions";
import { ErrorBoundary } from "react-error-boundary";
import { useLiveQuery } from "dexie-react-hooks";
import { useTheme } from "../App";
import { variantEnum } from "../constants";

export const CollectionPage = () => {
  const [collection, setCollection] = useState<ICollection>(null);
  const { collectionId } = useParams();
  const [currentCollection, setCurrentCollection] = useLocalStorage("currentCollection", null);
  const { theme, setTheme } = useTheme();
  const parsedCollectionId = Number(collectionId);
  const hasValidCollectionId = Number.isSafeInteger(parsedCollectionId) && parsedCollectionId > 0;

  function fallbackRender({ error, resetErrorBoundary }) {
    // Call resetErrorBoundary() to reset the error boundary and retry the render.

    return (
      <div role="alert" style={{ width: "400px" }}>
        <p>Something went wrong:</p>
        <p style={{ color: "red" }}>{error.message}</p>
      </div>
    );
  }
  const liveCollection = useLiveQuery(
    async () => (hasValidCollectionId ? (await db.collections.get(parsedCollectionId)) ?? null : null),
    [hasValidCollectionId, parsedCollectionId],
  );

  useEffect(() => {
    if (!hasValidCollectionId || liveCollection === null) {
      setCurrentCollection(null);
    } else if (liveCollection) {
      setCollection(liveCollection);
      if (liveCollection.collectionType !== variantEnum.QUICK) {
        setCurrentCollection(collectionId);
      }
    }
  }, [hasValidCollectionId, liveCollection]);

  if (!hasValidCollectionId || liveCollection === null) {
    return currentCollection === null ? <Navigate to="/" replace /> : null;
  }

  return (
    <>
      <ErrorBoundary
        fallbackRender={fallbackRender}
        onError={() => setCurrentCollection(null)}
        onReset={(details) => {
          // Reset the state of your ap<p so the error doesn't happen again
        }}
      >
        {collection && (
          <div>
            <Collection collection={collection} />
          </div>
        )}
      </ErrorBoundary>
    </>
  );
};
