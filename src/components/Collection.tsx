import * as React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../models/db";
import { AddSection } from "./AddSection";

import { CheckIcon, ChevronIcon, ListIcon, SortByIcon } from "./customIcons";
import { ISection } from "../models/section";
import { Section } from "./Section";
import { ActionButton } from "./ActionButton";
import { useRef } from "react";
import { GeneralHeaderOptions, SortedSections } from "./GeneralCollectionComps";
import { BudgetHeaderOptions, newBudgetSection } from "./budgetCollectionComps";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AnimatedPage from "./AnimatedPage";
import { ActionButtonContext, ActionButtonProvider } from "../context/ActionButtonContext";
import { nanoid } from "nanoid";
import PortalModal from "./PortalModal";
import { newGeneralSection, variantEnum } from "../constants";
import NewQuickItem from "./NewQuickItem";
import { throttle } from "lodash";
import useLocalStorage from "../actions";
export const Collection = ({ collection }) => {
  const allSections = useLiveQuery(() => db.sections.where({ collectionId: collection._id }).toArray(), [collection]);

  const archivedSections = allSections?.filter((col) => col?.archived == true);
  const sections = allSections?.filter((col) => col?.archived !== true);
  const sortableGeneralSections = sections?.filter(
    (section) => (section.sectionMode ?? collection.collectionType) === variantEnum.GENERAL,
  );
  const hasGeneralSections = allSections?.some(
    (section) => (section.sectionMode ?? collection.collectionType) === variantEnum.GENERAL,
  );
  const [expandedAccordion, setExpandedAccordion] = React.useState(null);
  const [openNewSection, setOpenNewSection] = React.useState(false);
  const [sorted, setSorted] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);
  const [openNewItemModal, setOpenNewItemModal] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [focusedSectionId, setFocusedSectionId] = React.useState<string | null>(null);
  const [focusedSectionOpenPhase, setFocusedSectionOpenPhase] = React.useState<"waiting" | "ready" | null>(null);
  const [lastExpandedSection, setLastExpandedSection] = useLocalStorage("lastExpandedSection", null);
  const hasRestoredExpandedSection = useRef(false);

  const throttleSetIsAnimating = React.useCallback(
    throttle((newState) => setIsAnimating(newState), 1000),
    [],
  );
  const parentDivRef = useRef();
  const boxVariant = {
    hidden: {
      // y: "-100px", //move out of the site
      opacity: 0, //make it transparent
    },
    visible: {
      // y: 0, // bring it back to nrmal
      opacity: 1,
      transition: {
        when: "beforeChildren", //use this instead of delay
        staggerChildren: 0.04, //apply stagger on the parent tag
      },
    },
  };
  const listVariant = {
    hidden: {
      y: -12,
      opacity: 0,
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.18,
        ease: "easeOut",
      },
    },
  };
  const { actionBtnVisible, setActionBtnVisible } = React.useContext(ActionButtonContext);
  const newSection: ISection =
    collection?.collectionType === variantEnum.GENERAL ? newGeneralSection : newBudgetSection;
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (sorted) setExpandedAccordion(null);
  }, [sorted]);

  React.useEffect(() => {
    if (focusedSectionId && allSections && !allSections.some((section) => section._id === focusedSectionId)) {
      setFocusedSectionId(null);
    }
  }, [allSections, collection._id, focusedSectionId]);

  React.useEffect(() => {
    if (
      hasRestoredExpandedSection.current ||
      !sections ||
      sorted ||
      collection.collectionType === variantEnum.QUICK ||
      !lastExpandedSection
    )
      return;

    hasRestoredExpandedSection.current = true;
    if (lastExpandedSection.collectionId !== collection._id) return;

    const visibleSections = collection.collectionType === variantEnum.QUICK ? [...sections].reverse() : sections;
    const expandedIndex = visibleSections.findIndex((section) => section._id === lastExpandedSection.sectionId);

    if (expandedIndex >= 0) setExpandedAccordion(expandedIndex);
  }, [sections, collection, lastExpandedSection]);

  React.useEffect(() => {
    if (expandedAccordion === null || !sections || collection.collectionType === variantEnum.QUICK) return;

    const visibleSections = collection.collectionType === variantEnum.QUICK ? [...sections].reverse() : sections;
    const section = visibleSections[expandedAccordion];

    if (
      section?._id &&
      (lastExpandedSection?.collectionId !== collection._id || lastExpandedSection?.sectionId !== section._id)
    ) {
      setLastExpandedSection({ collectionId: collection._id, sectionId: section._id });
    }
  }, [expandedAccordion, sections, collection._id, collection.collectionType, lastExpandedSection]);

  React.useEffect(() => {
    if (expandedAccordion === null || sections?.length === 1) {
      sorted !== true ? setActionBtnVisible(true) : setActionBtnVisible(false);
    } else {
      setActionBtnVisible(false);
    }
  }, [expandedAccordion, sections?.length, sorted]);

  const handleCloseNewSection = () => {
    setActionBtnVisible(true);
    setOpenNewSection(false);
  };

  const handleCloseNewItemModal = () => {
    setActionBtnVisible(true);
    setOpenNewItemModal(false);
  };
  const createSections = (sections) => {
    if (collection.collectionType === variantEnum.QUICK) {
      sections = [...sections].reverse();
    }
    const renderedSections = sections?.map((section, i) =>
      !focusedSectionId || section._id === focusedSectionId ? (
        <motion.div
          key={section._id}
          layout="position"
          initial="hidden"
          animate="visible"
          variants={listVariant}
          exit="hidden"
        >
          <Section
            handleAnimation={(e) => throttleSetIsAnimating(e)}
            isAnimating={isAnimating}
            section={section}
            collectionId={collection._id}
            listItem={i}
            filterType={collection.collectionType === "quick" ? "QUICK" : null}
            variant={collection.collectionType}
            expandedAccordion={expandedAccordion}
            setExpandedAccordion={setExpandedAccordion}
            isOnly={sections.length === 1}
            focusedSectionId={focusedSectionId}
            setFocusedSectionId={(sectionId) => {
              setFocusedSectionId(sectionId);
              if (!sectionId) setFocusedSectionOpenPhase(null);
            }}
            onFocusSection={(shouldOpen) => {
              setFocusedSectionId(section._id);
              setFocusedSectionOpenPhase(shouldOpen ? (sections.length > 1 ? "waiting" : "ready") : null);
            }}
            openAfterFocus={focusedSectionId === section._id && focusedSectionOpenPhase === "ready"}
            onOpenAfterFocus={() => setFocusedSectionOpenPhase(null)}
          />
        </motion.div>
      ) : null,
    );
    return (
      <>
        {renderedSections}
        <motion.div
          key="debug-invisible-section"
          layout="position"
          aria-hidden="true"
          className="sectionHeaderContainer relative origin-top rounded-md mb-1 flex items-center px-3"
          style={{ height: "44px", pointerEvents: "none", opacity: 0 }}
        >
          Debug section
        </motion.div>
      </>
    );
  };

  const saveChange = async (saveProps) => {
    const { title, tag, comment, checkListMode, numberedList, commentVisible, sectionMode } = saveProps;
    const trimmedTitle = title?.trim();
    if (!trimmedTitle) return;

    await db.sections.add({
      _id: nanoid(),
      title: trimmedTitle,
      collectionId: collection._id,
      tag: tag,
      comment: comment,
      commentVisible: commentVisible,
      numberedList: numberedList,
      checkListMode: checkListMode,
      sectionMode: sectionMode ?? (collection.collectionType === "budget" ? "budget" : "general"),
      dataVersion: 1,
    });
    setActionBtnVisible(true);
    setOpenNewSection(false);
  };

  const handleChangeRoute = (route: string) => {
    if (route === "/") {
      localStorage.removeItem("currentCollection");
      localStorage.removeItem("lastExpandedSection");
    }
    setActionBtnVisible(false);
    navigate(route, { state: { from: location } });
  };

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (sorted) {
        setActionBtnVisible(false);
      } else {
        setActionBtnVisible(true);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [sorted]);
  return (
    <AnimatedPage>
      <div className="budgetBackground relative ">
        <AnimatePresence mode="wait">
          {collection && (
            <>
              <div className="pageHeader-bg rounded-md p-3 m-2 flex justify-between items-center">
                <div className="flex w-full items-center headertext" style={{ overflowX: "hidden", overflowY: "auto" }}>
                  <button
                    style={{ padding: "0.4rem 0.6rem" }}
                    className="btn-header rounded-md"
                    onClick={() => handleChangeRoute("/")}
                  >
                    <ChevronIcon style={{ transform: "rotate(90deg)" }} />
                  </button>
                  <div className="text-lg font-medium ml-3">{collection.title}</div>
                  <div className="flex-grow"></div>
                  {collection.collectionType === variantEnum.GENERAL || hasGeneralSections ? (
                    <GeneralHeaderOptions
                      sections={allSections}
                      collection={collection}
                      sorted={sorted}
                      setSorted={setSorted}
                    />
                  ) : (
                    <BudgetHeaderOptions sections={sections} />
                  )}
                </div>
              </div>

              <LayoutGroup>
                <AnimatePresence>
                  {sorted !== true && (
                    <PortalModal showModal={openNewSection} handleCloseCB={handleCloseNewSection}>
                      <div style={{ width: "100%", padding: "0.5em" }}>
                        <AddSection
                          saveCB={saveChange}
                          variant={collection.collectionType}
                          newSection={{
                            ...newSection,
                            collectionId: collection._id,
                          }}
                          placeholder="Add section..."
                        />
                      </div>
                    </PortalModal>
                  )}
                </AnimatePresence>
                {sections && (
                  <LayoutGroup>
                    <motion.div
                      style={{
                        overflowX: "hidden",
                        overflowY: isAnimating ? "hidden" : "visible",
                      }}
                      className="w-full flex-1 px-2 pt-5"
                      ref={parentDivRef}
                      variants={boxVariant}
                      animate="visible"
                      initial="hidden"
                    >
                      {sorted ? (
                        <>
                          <SortedSections sections={sortableGeneralSections} collection={collection} />
                          <AnimatePresence>
                            {archivedSections.length > 0 && (
                              <motion.button
                                key="archived"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4, duration: 0.4 }}
                                exit={{ opacity: 0 }}
                                type="button"
                                style={{
                                  background: "var(--sectionheader-bg)",
                                  color: "var(--sectionheader-text)",
                                }}
                                className="rounded-md mr-1 flex items-center mb-4"
                                onClick={() => setShowArchived(!showArchived)}
                              >
                                <ChevronIcon
                                  style={{
                                    width: ".7em",
                                    margin: "4px 4px 3px 8px",
                                    transform: `${showArchived ? "rotate(180deg)" : "rotate(0deg)"}`,
                                    transition: "all .2s ease-in-out",
                                  }}
                                />
                                archived{" "}
                                <span
                                  style={{
                                    margin: "4px",
                                    marginLeft: "8px",
                                    marginRight: "8px",
                                    fontWeight: 600,
                                    background: "#c9c9c92b",
                                    padding: "0 10px",
                                    borderRadius: "6px",
                                  }}
                                >
                                  {archivedSections.length}
                                </span>
                              </motion.button>
                            )}
                          </AnimatePresence>
                          {showArchived ? createSections(archivedSections) : null}{" "}
                        </>
                      ) : (
                        <AnimatePresence
                          initial={false}
                          onExitComplete={() => {
                            if (focusedSectionOpenPhase === "waiting") setFocusedSectionOpenPhase("ready");
                          }}
                        >
                          {createSections(sections)}
                        </AnimatePresence>
                      )}
                    </motion.div>
                  </LayoutGroup>
                )}
              </LayoutGroup>
            </>
          )}
        </AnimatePresence>
        <PortalModal showModal={openNewItemModal} handleCloseCB={handleCloseNewItemModal}>
          <NewQuickItem />
        </PortalModal>
        <ActionButton
          parentDivRef={parentDivRef}
          onClick={() => setOpenNewSection(true)}
          onClickSecondary={() => setOpenNewItemModal(true)}
        />
      </div>
    </AnimatedPage>
  );
};
