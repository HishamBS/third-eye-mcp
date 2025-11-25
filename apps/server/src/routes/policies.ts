import { Hono } from "hono";
import { getDb } from "@third-eye/db";
import { PolicyManager } from "@third-eye/core";
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";
import {
  ApiErrorCode,
  ApiErrorTitle,
  ApiErrorMessage,
  formatPolicyNotFound,
} from "@third-eye/constants";

/**
 * Routing Policies Routes - Phase 3
 *
 * Manages routing policies for Constrained Dynamic mode
 * Policies define mandatory/forbidden eyes, security requirements, constraints
 */

const app = new Hono();

// Apply middleware
app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

// Get all policies
app.get("/", async (c) => {
  try {
    const { db, sqlite } = getDb();
    const policyManager = new PolicyManager(sqlite);

    const isActiveParam = c.req.query("active");
    const filters =
      isActiveParam !== undefined
        ? { isActive: isActiveParam === "true" }
        : undefined;

    const policies = policyManager.listPolicies(filters);

    return createSuccessResponse(c, { policies });
  } catch (error) {
    console.error(ApiErrorMessage.POLICY_FETCH_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.POLICY_FETCH_FAILED);
  }
});

// Get specific policy
app.get("/:id", async (c) => {
  try {
    const policyId = c.req.param("id");
    const { db, sqlite } = getDb();
    const policyManager = new PolicyManager(sqlite);

    const policy = policyManager.getPolicy(policyId);

    if (!policy) {
      return createNotFoundResponse(c, formatPolicyNotFound(policyId));
    }

    return createSuccessResponse(c, { policy });
  } catch (error) {
    console.error(ApiErrorMessage.POLICY_SINGLE_FETCH_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.POLICY_SINGLE_FETCH_FAILED);
  }
});

// Create new policy
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { db, sqlite } = getDb();
    const policyManager = new PolicyManager(sqlite);

    // Validate required fields
    if (
      !body.name ||
      !body.mandatoryEyes ||
      !Array.isArray(body.mandatoryEyes)
    ) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        status: 400,
        detail: ApiErrorMessage.POLICY_REQUIRED_FIELDS,
        code: ApiErrorCode.INVALID_REQUEST,
      });
    }

    const policy = await policyManager.createPolicy({
      name: body.name,
      description: body.description,
      mandatoryEyes: body.mandatoryEyes,
      forbiddenEyes: body.forbiddenEyes,
      minValidationEyes: body.minValidationEyes,
      securityRequired: body.securityRequired,
      alwaysConfirmIntent: body.alwaysConfirmIntent,
      customConstraints: body.customConstraints,
    });

    // Broadcast policy creation via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToAll({
        type: "pipeline_event",
        timestamp: Date.now(),
        data: {
          eventType: "policy_created",
          policy,
        },
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }

    return createSuccessResponse(c, { policy }, { status: 201 });
  } catch (error) {
    console.error(ApiErrorMessage.POLICY_CREATE_FAILED_DETAIL, error);
    if (error instanceof Error) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.POLICY_CREATE_ERROR,
        status: 400,
        detail: error.message,
        code: ApiErrorCode.POLICY_CREATE_FAILED,
      });
    }
    return createInternalErrorResponse(c, ApiErrorMessage.POLICY_CREATE_FAILED_DETAIL);
  }
});

// Update policy
app.put("/:id", async (c) => {
  try {
    const policyId = c.req.param("id");
    const body = await c.req.json();
    const { db, sqlite } = getDb();
    const policyManager = new PolicyManager(sqlite);

    const policy = await policyManager.updatePolicy(policyId, {
      name: body.name,
      description: body.description,
      mandatoryEyes: body.mandatoryEyes,
      forbiddenEyes: body.forbiddenEyes,
      minValidationEyes: body.minValidationEyes,
      securityRequired: body.securityRequired,
      alwaysConfirmIntent: body.alwaysConfirmIntent,
      customConstraints: body.customConstraints,
      isActive: body.isActive,
    });

    // Broadcast policy update via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToAll({
        type: "pipeline_event",
        timestamp: Date.now(),
        data: {
          eventType: "policy_updated",
          policy,
        },
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }

    return createSuccessResponse(c, { policy });
  } catch (error) {
    console.error(ApiErrorMessage.POLICY_UPDATE_FAILED_DETAIL, error);
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return createNotFoundResponse(c, error.message);
      }
      return createErrorResponse(c, {
        title: ApiErrorTitle.POLICY_UPDATE_ERROR,
        status: 400,
        detail: error.message,
        code: ApiErrorCode.POLICY_UPDATE_FAILED,
      });
    }
    return createInternalErrorResponse(c, ApiErrorMessage.POLICY_UPDATE_FAILED_DETAIL);
  }
});

// Delete policy
app.delete("/:id", async (c) => {
  try {
    const policyId = c.req.param("id");
    const { db, sqlite } = getDb();
    const policyManager = new PolicyManager(sqlite);

    const deleted = policyManager.deletePolicy(policyId);

    if (!deleted) {
      return createNotFoundResponse(c, formatPolicyNotFound(policyId));
    }

    // Broadcast policy deletion via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToAll({
        type: "policy_deleted",
        policyId,
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }

    return createSuccessResponse(c, { message: ApiErrorMessage.POLICY_DELETED });
  } catch (error) {
    console.error(ApiErrorMessage.POLICY_DELETE_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.POLICY_DELETE_FAILED);
  }
});

// Test policy against eye sequence
app.post("/:id/test", async (c) => {
  try {
    const policyId = c.req.param("id");
    const body = await c.req.json();
    const { db, sqlite } = getDb();
    const policyManager = new PolicyManager(sqlite);

    if (!body.eyeSequence || !Array.isArray(body.eyeSequence)) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        status: 400,
        detail: ApiErrorMessage.EYE_SEQUENCE_REQUIRED,
        code: ApiErrorCode.INVALID_REQUEST,
      });
    }

    const policy = policyManager.getPolicy(policyId);
    if (!policy) {
      return createNotFoundResponse(c, formatPolicyNotFound(policyId));
    }

    const result = policyManager.testPolicy(policy, body.eyeSequence);

    return createSuccessResponse(c, { result });
  } catch (error) {
    console.error(ApiErrorMessage.POLICY_TEST_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.POLICY_TEST_FAILED);
  }
});

// Activate policy
app.post("/:id/activate", async (c) => {
  try {
    const policyId = c.req.param("id");
    const { db, sqlite } = getDb();
    const policyManager = new PolicyManager(sqlite);

    const activated = await policyManager.activatePolicy(policyId);

    if (!activated) {
      return createNotFoundResponse(c, formatPolicyNotFound(policyId));
    }

    // Broadcast policy activation via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToAll({
        type: "policy_activated",
        policyId,
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }

    return createSuccessResponse(c, {
      message: ApiErrorMessage.POLICY_ACTIVATED,
    });
  } catch (error) {
    console.error(ApiErrorMessage.POLICY_ACTIVATE_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.POLICY_ACTIVATE_FAILED);
  }
});

// Deactivate policy
app.post("/:id/deactivate", async (c) => {
  try {
    const policyId = c.req.param("id");
    const { db, sqlite } = getDb();
    const policyManager = new PolicyManager(sqlite);

    const deactivated = await policyManager.deactivatePolicy(policyId);

    if (!deactivated) {
      return createNotFoundResponse(c, formatPolicyNotFound(policyId));
    }

    // Broadcast policy deactivation via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToAll({
        type: "policy_deactivated",
        policyId,
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }

    return createSuccessResponse(c, {
      message: ApiErrorMessage.POLICY_DEACTIVATED,
    });
  } catch (error) {
    console.error(ApiErrorMessage.POLICY_DEACTIVATE_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.POLICY_DEACTIVATE_FAILED);
  }
});

export default app;
