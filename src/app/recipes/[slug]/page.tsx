import RecipeClient from "./RecipeClient";
import { getPublishedRecipes } from "@/lib/notes";

// Generate static params for published recipes
export async function generateStaticParams() {
  try {
    const recipes = await getPublishedRecipes();
    const slugs = recipes
      .filter(r => r.slug)
      .map(r => ({ slug: r.slug! }));
    return slugs.length > 0 ? slugs : [{ slug: "placeholder" }];
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return [{ slug: "placeholder" }];
  }
}

export default function RecipePage() {
  return <RecipeClient />;
}
