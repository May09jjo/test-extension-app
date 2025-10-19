import { render } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';

import { getIssues, updateIssues } from './utils';

// --- Data Fetching Utilities ---
// These functions now use the Shopify Admin GraphQL API directly,
// storing the issues in a product metafield.

const METAFIELD_NAMESPACE = 'com_my_app_issues';
const METAFIELD_KEY = 'issues_list';

/**
 * Fetches issues for a given product ID from a metafield.
 * //@param {string} productId - The ID of the product.
 * //@returns {Promise<Array>} A promise that resolves to the list of issues or an empty array.
 */
// async function getIssues(productId) {
//   const query = `
//     query Product($id: ID!) {
//       product(id: $id) {
//         issues: metafield(namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
//           value
//         }
//       }
//     }`;

//   const res = await fetch("shopify:admin/api/graphql.json", {
//     method: "POST",
//     body: JSON.stringify({ query, variables: { id: productId } }),
//   });

//   if (!res.ok) {
//     console.error('Network error while fetching issues.');
//     return [];
//   }

//   const responseData = await res.json();
//   const metafield = responseData.data?.product?.issues;

//   if (metafield && metafield.value) {
//     try {
//       return JSON.parse(metafield.value);
//     } catch (e) {
//       console.error("Error parsing issues from metafield:", e);
//       return [];
//     }
//   }

//   return [];
// }

/**
 * Updates the issues metafield for a given product.
 * //@param {string} productId - The ID of the product.
 * //@param {Array} issues - The new list of issues to save.
 */

// async function updateIssues(productId, issues) {
//   const mutation = `
//     mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
//       metafieldsSet(metafields: $metafields) {
//         userErrors {
//           field
//           message
//         }
//       }
//     }`;

//   const metafields = [{
//     ownerId: productId,
//     namespace: METAFIELD_NAMESPACE,
//     key: METAFIELD_KEY,
//     type: 'json',
//     value: JSON.stringify(issues),
//   }];

//   const res = await fetch("shopify:admin/api/graphql.json", {
//     method: "POST",
//     body: JSON.stringify({ query: mutation, variables: { metafields } }),
//   });

//   if (!res.ok) {
//     console.error('Network error while updating issues.');
//   }

//   const responseData = await res.json();
//   if (responseData.data?.metafieldsSet?.userErrors?.length > 0) {
//       console.error("Errors setting metafield:", responseData.data.metafieldsSet.userErrors);
//   }
// }


// --- Helper Functions ---

function generateId(allIssues) {
  return !allIssues?.length ? 0 : allIssues[allIssues.length - 1].id + 1;
}

function validateForm({ title, description }) {
  return {
    isValid: Boolean(title) && Boolean(description),
    errors: {
      title: !title,
      description: !description,
    },
  };
}

// --- Main Extension Entry Point ---
export default async () => {
  render(<Extension />, document.body);
};


// --- Preact Component ---
function Extension() {
  // The global 'shopify' object provides access to the extension APIs
  const { close, data } = shopify;
  const productId = data.selected[0].id;

  const [issue, setIssue] = useState({ title: "", description: "" });
  const [allIssues, setAllIssues] = useState([]);
  const [formErrors, setFormErrors] = useState(null);
  const { title, description } = issue;

  useEffect(() => {
    getIssues(productId).then(issues => setAllIssues(issues || []));
  }, [productId]);

  const onSubmit = useCallback(async () => {
    const { isValid, errors } = validateForm(issue);
    setFormErrors(errors);

    if (isValid) {
      const newIssue = {
        id: generateId(allIssues),
        completed: false,
        ...issue,
      };
      // Commit changes to the database
      await updateIssues(productId, [...allIssues, newIssue]);
      // Close the modal using the 'close' API
      close();
    }
  }, [issue, productId, allIssues, close]);

  const handleFieldChange = (field, value) => {
    setIssue(prev => ({ ...prev, [field]: value }));
  };

  // The UI is built with Polaris-like web components.
  // Old React components are mapped as follows:
  // - AdminAction -> <s-admin-action>
  // - Button -> <s-button slot="...">
  // - TextField -> <s-text-field>
  // - TextArea -> <s-text-area>
  // - Box -> <s-stack> for layout
  return (
    <s-admin-action>
        <s-stack direction="block" gap="base">
            <s-text type="strong" >Create an issue</s-text>
            <s-text-field
                label="Title"
                value={title}
                maxLength={50}
                error={formErrors?.title ? "Please enter a title" : undefined}
                onInput={(e) => handleFieldChange('title', e.currentTarget.value)}
            />
            <s-text-area
                label="Description"
                value={description}
                maxLength={300}
                error={formErrors?.description ? "Please enter a description" : undefined}
                onInput={(e) => handleFieldChange('description', e.currentTarget.value)}
            />
        </s-stack>

        <s-button slot="primary-action" onClick={onSubmit}>Create</s-button>
        <s-button slot="secondary-actions" onClick={close}>Cancel</s-button>
    </s-admin-action>
  );
}
