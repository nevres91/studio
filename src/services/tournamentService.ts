"use client";

import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  where,
} from "firebase/firestore";
import type {
  StoredTournament,
  StoredTournamentData,
  TournamentScheduleItem,
} from "../lib/tournamentTypes";
import type {
  GenerateTournamentOutput,
  GenerateTournamentInput,
} from "@/ai/flows/generate-tournament-flow";
import { promiseWithTimeout } from "@/lib/utils";

const FIRESTORE_TIMEOUT_MS = 15000;

function mapDocToStoredTournament(
  docSnap: import("firebase/firestore").DocumentSnapshot<
    import("firebase/firestore").DocumentData
  >
): StoredTournament {
  const data = docSnap.data()!; // Assumes document exists and has data
  return {
    id: docSnap.id,
    tournamentName: data.tournamentName,
    description: data.description,
    schedule: (data.schedule || []).map((item: any) => ({
      id: item.id, // Ensure this is mapped
      round: item.round,
      match: item.match,
      participants: item.participants || [],
      status: item.status || "pending",
      winner: item.winner,
      notes: item.notes,
    })) as TournamentScheduleItem[],
    standingsExplanation: data.standingsExplanation,
    advancementRules: data.advancementRules,
    tieBreakingRules: data.tieBreakingRules,
    playerNames: data.playerNames || [], // Ensure playerNames is always an array
    tournamentType: data.tournamentType,
    scoringSystem: data.scoringSystem,
    createdAt: data.createdAt as Timestamp,
    overallStatus:
      (data.overallStatus as StoredTournament["overallStatus"]) || "new",
  };
}

export async function saveTournament(
  aiOutput: GenerateTournamentOutput,
  originalInput: GenerateTournamentInput
): Promise<StoredTournament> {
  if (!db) {
    console.error(
      "[TournamentService] Firestore 'db' instance is not available."
    );
    throw new Error("Firestore not initialized");
  }

  const dataToSave: Omit<
    StoredTournamentData,
    "playerNames" | "tournamentType" | "scoringSystem"
  > = {
    ...aiOutput,
  };

  let docRefId: string;

  try {
    const docRef = await promiseWithTimeout(
      addDoc(collection(db, "tournaments"), {
        ...dataToSave,
        playerNames: originalInput.playerNames,
        tournamentType: originalInput.tournamentType,
        scoringSystem: originalInput.scoringSystem,
        overallStatus: "new",
        createdAt: serverTimestamp(),
      }),
      FIRESTORE_TIMEOUT_MS,
      new Error("Timeout saving tournament to Firestore")
    );
    console.log(
      "[TournamentService] Tournament initially saved to Firestore with ID:",
      docRef.id
    );
    docRefId = docRef.id;

    const newDocSnap = await promiseWithTimeout(
      getDoc(doc(db, "tournaments", docRefId)),
      FIRESTORE_TIMEOUT_MS,
      new Error(`Timeout fetching newly saved tournament ${docRefId}`)
    );

    if (!newDocSnap.exists()) {
      console.error(
        `[TournamentService] Newly created tournament with ID ${docRefId} not found after saving.`
      );
      throw new Error(
        `Failed to fetch newly created tournament document with ID ${docRefId}.`
      );
    }

    const newTournament = mapDocToStoredTournament(newDocSnap);
    console.log(
      "[TournamentService] Successfully fetched and constructed new tournament object:",
      newTournament.id
    );
    return newTournament;
  } catch (error) {
    console.error("[TournamentService] Error in saveTournament flow:", error);
    if (error instanceof Error) {
      throw new Error(
        `Failed to save or retrieve tournament: ${error.message}`
      );
    }
    throw new Error(
      "Failed to save or retrieve tournament due to an unknown error."
    );
  }
}

export async function getLatestTournament(): Promise<StoredTournament | null> {
  if (!db) {
    console.error(
      "[TournamentService] Firestore 'db' instance is not available."
    );
    throw new Error("Firestore not initialized");
  }
  try {
    const tournamentsRef = collection(db, "tournaments");

    // Try to get the latest "in-progress" tournament
    // Index needed: tournaments collection, overallStatus (ASC), createdAt (DESC)
    const inProgressQuery = query(
      tournamentsRef,
      where("overallStatus", "==", "in-progress"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    let querySnapshot = await promiseWithTimeout(
      getDocs(inProgressQuery),
      FIRESTORE_TIMEOUT_MS,
      new Error(
        'Timeout fetching latest "in-progress" tournament from Firestore'
      )
    );

    if (!querySnapshot.empty) {
      const tournament = mapDocToStoredTournament(querySnapshot.docs[0]);
      console.log(
        '[TournamentService] Latest "in-progress" tournament fetched:',
        tournament.id
      );
      return tournament;
    }

    // If no "in-progress", try to get the latest "new" tournament
    // Index needed: tournaments collection, overallStatus (ASC), createdAt (DESC)
    const newTournamentQuery = query(
      tournamentsRef,
      where("overallStatus", "==", "new"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    querySnapshot = await promiseWithTimeout(
      getDocs(newTournamentQuery),
      FIRESTORE_TIMEOUT_MS,
      new Error('Timeout fetching latest "new" tournament from Firestore')
    );

    if (!querySnapshot.empty) {
      const tournament = mapDocToStoredTournament(querySnapshot.docs[0]);
      console.log(
        '[TournamentService] Latest "new" tournament fetched:',
        tournament.id
      );
      return tournament;
    }

    console.log(
      "[TournamentService] No active (new or in-progress) tournaments found in Firestore."
    );
    return null;
  } catch (error) {
    console.error(
      "[TournamentService] Error fetching latest tournament:",
      error
    );
    let detailedMessage = "Failed to fetch latest tournament.";
    const firebaseError = error as { code?: string; message?: string };

    if (
      firebaseError.code === "failed-precondition" ||
      (firebaseError.message &&
        (firebaseError.message.toLowerCase().includes("index required") ||
          firebaseError.message
            .toLowerCase()
            .includes("query requires an index")))
    ) {
      detailedMessage =
        "CRITICAL: A Firestore index is required for this operation. " +
        "Please go to your Firebase console (Project -> Firestore Database -> Indexes tab) " +
        "and create the composite index. Firestore often provides a direct link to create it " +
        "in the browser's developer console or server logs when this error occurs. " +
        "The query typically involves fields like 'overallStatus' and 'createdAt'.";

      if (
        firebaseError.message &&
        firebaseError.message.includes("https://console.firebase.google.com/")
      ) {
        detailedMessage += " Link found in error: " + firebaseError.message;
      } else {
        detailedMessage +=
          " Original error: " +
          (firebaseError.message || "Unknown Firebase error.");
      }

      console.error(
        "************************************************************************************************************************\n" +
          `Firestore Missing Index Alert for getLatestTournament: ${detailedMessage}\n` +
          "************************************************************************************************************************"
      );
    } else if (firebaseError.message) {
      detailedMessage = `Failed to fetch latest tournament: ${firebaseError.message}`;
    }

    throw new Error(detailedMessage);
  }
}

export async function getTournamentById(
  id: string
): Promise<StoredTournament | null> {
  if (!db) {
    console.error(
      "[TournamentService] Firestore 'db' instance is not available."
    );
    throw new Error("Firestore not initialized");
  }
  if (!id) {
    console.error(
      "[TournamentService] getTournamentById called with invalid ID."
    );
    return null;
  }

  try {
    const tournamentDocRef = doc(db, "tournaments", id);
    const docSnap = await promiseWithTimeout(
      getDoc(tournamentDocRef),
      FIRESTORE_TIMEOUT_MS,
      new Error(`Timeout fetching tournament ${id}`)
    );

    if (docSnap.exists()) {
      console.log(`[TournamentService] Fetched tournament by ID: ${id}`);
      return mapDocToStoredTournament(docSnap);
    } else {
      console.log(`[TournamentService] No tournament found with ID: ${id}`);
      return null;
    }
  } catch (error) {
    console.error(
      `[TournamentService] Error fetching tournament by ID ${id}:`,
      error
    );
    if (error instanceof Error) {
      throw new Error(`Failed to fetch tournament ${id}: ${error.message}`);
    }
    throw new Error(
      `Failed to fetch tournament ${id} due to an unknown error.`
    );
  }
}

export async function recordMatchWinner(
  tournamentId: string,
  matchId: string,
  winnerName: string
): Promise<StoredTournament> {
  if (!db) {
    console.error(
      "[TournamentService] Firestore 'db' instance is not available."
    );
    throw new Error("Firestore not initialized");
  }
  const tournamentDocRef = doc(db, "tournaments", tournamentId);

  try {
    const tournamentSnap = await promiseWithTimeout(
      getDoc(tournamentDocRef),
      FIRESTORE_TIMEOUT_MS,
      new Error(`Timeout fetching tournament ${tournamentId} for update`)
    );

    if (!tournamentSnap.exists()) {
      throw new Error(`Tournament with ID ${tournamentId} not found.`);
    }

    const tournamentData = tournamentSnap.data() as StoredTournamentData & {
      overallStatus: StoredTournament["overallStatus"];
      createdAt: Timestamp;
    };
    const newSchedule = tournamentData.schedule.map((matchItem: any) => {
      if (matchItem.id === matchId) {
        return {
          ...matchItem,
          winner: winnerName,
          status: "completed" as const,
        };
      }
      return matchItem;
    });

    let newOverallStatus = tournamentData.overallStatus;
    // If it was 'new' and now has a completed match, move to 'in-progress'
    if (
      newOverallStatus === "new" &&
      newSchedule.some((m: any) => m.status === "completed")
    ) {
      newOverallStatus = "in-progress";
    }

    await promiseWithTimeout(
      updateDoc(tournamentDocRef, {
        schedule: newSchedule,
        overallStatus: newOverallStatus,
      }),
      FIRESTORE_TIMEOUT_MS,
      new Error(`Timeout updating match result for tournament ${tournamentId}`)
    );

    console.log(
      `[TournamentService] Match ${matchId} result recorded for tournament ${tournamentId}. Winner: ${winnerName}. Overall status: ${newOverallStatus}`
    );

    // Fetch the updated document to return the full StoredTournament object
    const updatedSnap = await promiseWithTimeout(
      getDoc(tournamentDocRef),
      FIRESTORE_TIMEOUT_MS,
      new Error(
        `Timeout fetching updated tournament ${tournamentId} after recording winner`
      )
    );
    if (!updatedSnap.exists()) {
      throw new Error(
        `Failed to fetch updated tournament ${tournamentId} after recording winner.`
      );
    }
    return mapDocToStoredTournament(updatedSnap);
  } catch (error) {
    console.error(
      `[TournamentService] Error recording match winner for tournament ${tournamentId}, match ${matchId}:`,
      error
    );
    if (error instanceof Error) {
      throw new Error(
        `Failed to record match winner for tournament ${tournamentId}: ${error.message}`
      );
    }
    throw new Error(
      `Failed to record match winner for tournament ${tournamentId} due to an unknown error.`
    );
  }
}

export async function finalizeTournament(
  tournamentId: string
): Promise<StoredTournament> {
  if (!db) {
    console.error(
      "[TournamentService] Firestore 'db' instance is not available."
    );
    throw new Error("Firestore not initialized");
  }
  const tournamentDocRef = doc(db, "tournaments", tournamentId);

  try {
    const tournamentSnap = await promiseWithTimeout(
      getDoc(tournamentDocRef),
      FIRESTORE_TIMEOUT_MS,
      new Error(`Timeout fetching tournament ${tournamentId} for finalization`)
    );

    if (!tournamentSnap.exists()) {
      throw new Error(
        `Tournament with ID ${tournamentId} not found for finalization.`
      );
    }

    await promiseWithTimeout(
      updateDoc(tournamentDocRef, {
        overallStatus: "completed",
      }),
      FIRESTORE_TIMEOUT_MS,
      new Error(`Timeout finalizing tournament ${tournamentId}`)
    );
    console.log(`[TournamentService] Tournament ${tournamentId} finalized.`);

    const updatedTournamentSnap = await getDoc(tournamentDocRef);
    if (!updatedTournamentSnap.exists()) {
      throw new Error(
        `Tournament data not found after finalizing tournament ${tournamentId}.`
      );
    }

    return mapDocToStoredTournament(updatedTournamentSnap);
  } catch (error) {
    console.error(
      `[TournamentService] Error finalizing tournament ${tournamentId}:`,
      error
    );
    if (error instanceof Error) {
      throw new Error(
        `Failed to finalize tournament ${tournamentId}: ${error.message}`
      );
    }
    throw new Error(
      `Failed to finalize tournament ${tournamentId} due to an unknown error.`
    );
  }
}

export async function getCompletedTournaments(): Promise<StoredTournament[]> {
  if (!db) {
    console.error(
      "[TournamentService] Firestore 'db' instance is not available."
    );
    throw new Error("Firestore not initialized");
  }
  try {
    const tournamentsRef = collection(db, "tournaments");
    // IMPORTANT: This query requires a composite index in Firestore.
    // Collection: tournaments, Fields: overallStatus (ASC), createdAt (DESC)
    const q = query(
      tournamentsRef,
      where("overallStatus", "==", "completed"),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await promiseWithTimeout(
      getDocs(q),
      FIRESTORE_TIMEOUT_MS,
      new Error("Timeout fetching completed tournaments from Firestore")
    );

    const completedTournaments = querySnapshot.docs.map((docSnap: any) =>
      mapDocToStoredTournament(docSnap)
    );
    console.log(
      `[TournamentService] Fetched ${completedTournaments.length} completed tournaments.`
    );
    return completedTournaments;
  } catch (error) {
    console.error(
      "[TournamentService] Error fetching completed tournaments:",
      error
    );
    let detailedMessage = "Failed to fetch completed tournaments.";
    const firebaseError = error as { code?: string; message?: string };

    if (
      firebaseError.code === "failed-precondition" ||
      (firebaseError.message &&
        (firebaseError.message.toLowerCase().includes("index required") ||
          firebaseError.message
            .toLowerCase()
            .includes("query requires an index")))
    ) {
      detailedMessage =
        "CRITICAL: A Firestore index is required for this operation (fetching completed tournaments). " +
        "Please go to your Firebase console (Project -> Firestore Database -> Indexes tab) " +
        "and create the composite index. Firestore often provides a direct link to create it " +
        "in the browser's developer console or server logs when this error occurs. " +
        "The query typically involves filtering by 'overallStatus == completed' and ordering by 'createdAt DESC'.";

      if (
        firebaseError.message &&
        firebaseError.message.includes("https://console.firebase.google.com/")
      ) {
        detailedMessage += " Link found in error: " + firebaseError.message;
      } else {
        detailedMessage +=
          " Original error: " +
          (firebaseError.message || "Unknown Firebase error.");
      }

      console.error(
        "************************************************************************************************************************\n" +
          `Firestore Missing Index Alert for getCompletedTournaments: ${detailedMessage}\n` +
          "************************************************************************************************************************"
      );
    } else if (firebaseError.message) {
      detailedMessage = `Failed to fetch completed tournaments: ${firebaseError.message}`;
    }

    throw new Error(detailedMessage);
  }
}
