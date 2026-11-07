<template>
  <div class="pharmacie cde">
    <div class="cde-page-head">
      <div>
        <h1 class="cde-page-title">Pharmacie &amp; Stock</h1>
        <div class="cde-page-sub">Catalogue, stock, mouvements et délivrances</div>
      </div>
      <div class="cde-page-actions">
        <el-button
          v-if="canSeeComptabilite"
          @click="goComptabilite"
        >
          Comptabilité
        </el-button>
      </div>
    </div>

    <el-tabs
      v-model="activeTab"
      class="cde-tabs"
      @tab-click="onTabClick"
    >
      <el-tab-pane label="Catalogue" name="catalogue">
        <div class="cde-toolbar">
          <div class="cde-filters">
            <div class="cde-filter cde-toolbar__search">
              <span class="cde-filter__label">Recherche</span>
              <el-input
                v-model="catalogueSearch"
                placeholder="Rechercher un médicament (DCI, dosage…)"
                clearable
                :prefix-icon="Search"
                class="cde-toolbar__search-input"
              />
            </div>
            <div class="cde-filter">
              <span class="cde-filter__label">Type</span>
              <el-select
                v-model="catalogueTypeFilter"
                class="cde-toolbar__select"
                clearable
                placeholder="Type"
              >
                <el-option
                  v-for="t in TYPES_PRODUIT"
                  :key="t"
                  :label="TYPE_PRODUIT_LABEL[t]"
                  :value="t"
                />
              </el-select>
            </div>
          </div>
          <div class="cde-toolbar__actions">
            <el-button
              type="primary"
              :icon="Plus"
              @click="medicamentDialog?.open()"
            >
              Ajouter
            </el-button>
          </div>
        </div>

        <div class="cde-table-wrap">
          <el-table
            :data="cataloguePage"
            v-loading="medLoading"
            size="small"
            style="width: 100%"
            aria-label="Catalogue des médicaments"
          >
            <el-table-column label="DCI" min-width="150">
              <template #default="{ row }">{{ row.dci ?? '—' }}</template>
            </el-table-column>
            <el-table-column label="Nom commercial" min-width="150">
              <template #default="{ row }">{{ row.nomCommercial ?? '—' }}</template>
            </el-table-column>
            <el-table-column label="Dosage" width="110">
              <template #default="{ row }">{{ row.dosage ?? '—' }}</template>
            </el-table-column>
            <el-table-column label="Type" width="120">
              <template #default="{ row }">{{ typeProduitLabel(row.typeProduit) }}</template>
            </el-table-column>
            <el-table-column label="Forme" width="120">
              <template #default="{ row }">{{ row.forme ?? '—' }}</template>
            </el-table-column>
            <el-table-column label="Unité" width="80">
              <template #default="{ row }">{{ row.uniteStock ?? '—' }}</template>
            </el-table-column>
            <el-table-column label="Conditionnement" min-width="160">
              <template #default="{ row }">
                <span>{{ row.conditionnement ?? '—' }}</span>
                <span
                  v-if="formatContenance(row)"
                  class="cde-muted"
                > · {{ formatContenance(row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Prix achat" width="100" align="right">
              <template #default="{ row }">
                <span class="cde-num">{{ formatPrix(row.prixAchat) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Prix vente" width="100" align="right">
              <template #default="{ row }">
                <span class="cde-num">{{ formatPrix(row.prixVente) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Seuil" width="80" align="right">
              <template #default="{ row }">
                <span class="cde-num">{{ row.seuilAlerte ?? '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Actif" width="88">
              <template #default="{ row }">
                <span
                  :class="row.actif === false ? 'cde-badge cde-badge--muted' : 'cde-badge cde-badge--success'"
                >
                  {{ row.actif === false ? 'Inactif' : 'Actif' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="170" align="right">
              <template #default="{ row }">
                <el-button
                  size="small"
                  text
                  type="primary"
                  @click="medicamentDialog?.open(row)"
                >
                  Modifier
                </el-button>
                <el-button
                  size="small"
                  text
                  :type="row.actif === false ? 'success' : 'danger'"
                  @click="row.actif === false ? onReactivate(row) : onDeactivate(row)"
                >
                  {{ row.actif === false ? 'Activer' : 'Désactiver' }}
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <div class="cde-empty">Aucun médicament au catalogue</div>
            </template>
          </el-table>
        </div>

        <div class="cde-footer">
          <span class="cde-muted">{{ catalogueFiltered.length }} article(s)</span>
          <el-pagination
            :current-page="cataloguePage_num"
            :page-size="PAGE_SIZE"
            :total="catalogueFiltered.length"
            layout="prev, pager, next"
            @current-change="(v: number) => cataloguePage_num = v"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane label="Stock &amp; lots" name="stock">
        <div class="cde-toolbar">
          <div class="cde-filters">
            <div class="cde-filter cde-toolbar__search">
              <span class="cde-filter__label">Recherche</span>
              <el-input
                v-model="stockSearch"
                placeholder="Rechercher un article…"
                clearable
                :prefix-icon="Search"
                class="cde-toolbar__search-input"
              />
            </div>
          </div>
          <div class="cde-toolbar__actions">
            <el-button
              :icon="Refresh"
              :loading="stockLoading"
              @click="reloadStock"
            >
              Rafraîchir
            </el-button>
          </div>
        </div>

        <div class="cde-table-wrap">
          <el-table
            :data="stockPage"
            v-loading="stockLoading"
            size="small"
            style="width: 100%"
            aria-label="Niveaux de stock"
            @expand-change="onExpandStock"
          >
            <el-table-column type="expand">
              <template #default="{ row }">
                <el-table
                  :data="lotsCache[row.medicamentId] ?? []"
                  size="small"
                  style="width: 100%"
                >
                  <el-table-column label="N° lot" min-width="120">
                    <template #default="{ row: lot }">{{ lot.numeroLot ?? `#${lot.id}` }}</template>
                  </el-table-column>
                  <el-table-column label="Quantité" width="100" align="right">
                    <template #default="{ row: lot }">
                      <span class="cde-num">{{ lot.quantite ?? 0 }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="Qté initiale" width="100" align="right">
                    <template #default="{ row: lot }">
                      <span class="cde-num">{{ lot.quantiteInitiale ?? '—' }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="Péremption" width="130">
                    <template #default="{ row: lot }">
                      <span :class="badgeClass(lotState(lot))">
                        {{ lot.datePeremption ? formatDate(lot.datePeremption) : '—' }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="Entrée le" width="110">
                    <template #default="{ row: lot }">
                      {{ lot.dateEntree ? formatDate(lot.dateEntree) : '—' }}
                    </template>
                  </el-table-column>
                  <el-table-column label="Fournisseur" min-width="130">
                    <template #default="{ row: lot }">
                      {{ lot.fournisseurNom ?? (lot.fournisseurId != null ? `#${lot.fournisseurId}` : '—') }}
                    </template>
                  </el-table-column>
                  <el-table-column label="BL" width="118">
                    <template #default="{ row: lot }">
                      <el-button
                        size="small"
                        text
                        type="primary"
                        :disabled="lot.id == null"
                        :title="(lot.attachmentsCount ?? 0) > 0 ? 'Voir les pièces jointes du lot' : 'Joindre un BL'"
                        @click="openLotAttachments(lot)"
                      >
                        {{ (lot.attachmentsCount ?? 0) > 0 ? `${lot.attachmentsCount} pièce(s)` : 'Joindre' }}
                      </el-button>
                    </template>
                  </el-table-column>
                  <el-table-column label="Prix lot" width="100" align="right">
                    <template #default="{ row: lot }">
                      <span class="cde-num">{{ formatPrix(lot.prixAchat) }}</span>
                    </template>
                  </el-table-column>
                  <template #empty>
                    <div class="cde-empty">Aucun lot</div>
                  </template>
                </el-table>
              </template>
            </el-table-column>
            <el-table-column label="Article" min-width="180">
              <template #default="{ row }">{{ articleLabel(row) }}</template>
            </el-table-column>
            <el-table-column label="Stock total" width="110">
              <template #default="{ row }">
                <span :class="badgeClass(stockTone(row))">
                  {{ row.stockTotal }} {{ row.uniteStock }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="Seuil" width="80" align="right">
              <template #default="{ row }">
                <span class="cde-num">{{ row.seuilAlerte }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Alertes" min-width="160">
              <template #default="{ row }">
                <span
                  v-if="row.stockTotal <= 0"
                  class="cde-badge cde-badge--danger"
                >
                  Rupture
                </span>
                <span
                  v-else-if="row.stockTotal <= row.seuilAlerte"
                  class="cde-badge cde-badge--warning"
                >
                  Sous seuil
                </span>
                <span
                  v-if="row.prochainePeremption && isNearPeremption(row.prochainePeremption)"
                  class="cde-badge cde-badge--warning"
                >
                  Péremption {{ formatDate(row.prochainePeremption) }}
                </span>
                <span
                  v-if="row.stockTotal > row.seuilAlerte && !isNearPeremption(row.prochainePeremption)"
                  class="cde-muted"
                >
                  —
                </span>
              </template>
            </el-table-column>
            <el-table-column label="Nb lots" width="80" align="right">
              <template #default="{ row }">
                <span class="cde-num">{{ row.nbLots }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="210" align="right">
              <template #default="{ row }">
                <el-button
                  size="small"
                  text
                  type="primary"
                  @click="openEntree(row)"
                >
                  Entrée
                </el-button>
                <el-button
                  size="small"
                  text
                  type="warning"
                  :disabled="row.stockTotal <= 0"
                  @click="sortieDialog?.open({ medicamentId: row.medicamentId, label: articleLabel(row), stockTotal: row.stockTotal })"
                >
                  Sortie
                </el-button>
                <el-button
                  size="small"
                  text
                  type="info"
                  :disabled="row.nbLots === 0"
                  title="Ajuster"
                  @click="openAjustement(row)"
                >
                  Ajuster
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <div class="cde-empty">Aucun article en stock</div>
            </template>
          </el-table>
        </div>

        <div class="cde-footer">
          <span class="cde-muted">{{ stockFiltered.length }} article(s)</span>
          <el-pagination
            :current-page="stockPage_num"
            :page-size="PAGE_SIZE"
            :total="stockFiltered.length"
            layout="prev, pager, next"
            @current-change="(v: number) => stockPage_num = v"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane
        v-if="canSeeCommandes"
        label="Commandes"
        name="commandes"
        lazy
      >
        <CommandesTab />
      </el-tab-pane>

      <el-tab-pane label="Mouvements" name="mouvements">
        <div class="cde-toolbar">
          <div class="cde-filters">
            <div class="cde-filter cde-toolbar__search">
              <span class="cde-filter__label">Article</span>
              <el-select
                v-model="mouvementArticle"
                clearable
                placeholder="Tous les articles"
              >
                <el-option
                  v-for="n in niveaux"
                  :key="n.medicamentId"
                  :label="articleLabel(n)"
                  :value="n.medicamentId"
                />
              </el-select>
            </div>
            <div class="cde-filter">
              <span class="cde-filter__label">Type</span>
              <el-select
                v-model="mouvementType"
                class="cde-toolbar__select"
                clearable
                placeholder="Type"
              >
                <el-option
                  v-for="(label, value) in MOUVEMENT_TYPE_LABEL"
                  :key="value"
                  :label="label"
                  :value="value"
                />
              </el-select>
            </div>
          </div>
        </div>

        <div class="cde-table-wrap">
          <el-table
            :data="mouvements"
            v-loading="stockLoading"
            size="small"
            style="width: 100%"
            aria-label="Mouvements de stock"
          >
            <el-table-column label="Date" width="140">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="Article" min-width="170">
              <template #default="{ row }">{{ row.medicamentLabel || `#${row.medicamentId ?? '—'}` }}</template>
            </el-table-column>
            <el-table-column label="Type" width="150">
              <template #default="{ row }">
                {{ MOUVEMENT_TYPE_LABEL[row.type as MouvementStockType] ?? row.type }}
              </template>
            </el-table-column>
            <el-table-column label="Quantité" width="100" align="right">
              <template #default="{ row }">
                <span
                  class="cde-num"
                  :class="signedQuantite(row) < 0 ? 'pharmacie__neg' : 'pharmacie__pos'"
                >
                  {{ signedQuantite(row) > 0 ? `+${signedQuantite(row)}` : signedQuantite(row) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="Avant → Après" width="140" align="right">
              <template #default="{ row }">
                <span class="cde-num">{{ row.stockAvant ?? '—' }} → {{ row.stockApres ?? '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Référence" min-width="140">
              <template #default="{ row }">
                {{ row.referenceType ?? '—' }}{{ row.referenceId ? ` #${row.referenceId}` : '' }}
              </template>
            </el-table-column>
            <el-table-column label="Motif" min-width="140">
              <template #default="{ row }">{{ row.motif ?? '—' }}</template>
            </el-table-column>
            <el-table-column label="Utilisateur" width="110">
              <template #default="{ row }">{{ row.userId ?? '—' }}</template>
            </el-table-column>
            <template #empty>
              <div class="cde-empty">Aucun mouvement enregistré</div>
            </template>
          </el-table>
        </div>

        <div class="cde-footer">
          <span class="cde-muted">{{ mouvements.length }} mouvement(s)</span>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Délivrances" name="delivrances">
        <div class="cde-toolbar">
          <div class="cde-filters">
            <div class="cde-filter">
              <span class="cde-filter__label">Statut</span>
              <el-select
                v-model="delivranceStatut"
                class="cde-toolbar__select"
                placeholder="Statut"
                @change="reloadFile"
              >
                <el-option
                  v-for="(label, value) in DELIVRANCE_STATUT_LABEL"
                  :key="value"
                  :label="label"
                  :value="value"
                />
              </el-select>
            </div>
            <div class="cde-filter cde-toolbar__search">
              <span class="cde-filter__label">Document ordonnance</span>
              <el-input
                v-model="manualDocId"
                placeholder="ID document ordonnance (transfert manuel)"
                clearable
              />
            </div>
          </div>
          <div class="cde-toolbar__actions">
            <el-button
              :icon="Refresh"
              :loading="dispLoading"
              @click="reloadFile"
            >
              Rafraîchir
            </el-button>
            <el-button
              type="primary"
              :disabled="!manualDocId.trim()"
              @click="onManualTransfer"
            >
              Transférer
            </el-button>
          </div>
        </div>

        <div class="cde-table-wrap">
          <el-table
            :data="file"
            v-loading="dispLoading"
            size="small"
            style="width: 100%"
            aria-label="File des délivrances"
          >
            <el-table-column type="expand">
              <template #default="{ row }">
                <el-table
                  :data="row.lignes"
                  size="small"
                  style="width: 100%"
                >
                  <el-table-column label="Ligne" min-width="200">
                    <template #default="{ row: ligne }">
                      <span>{{ ligne.libelle }}</span>
                      <span
                        v-if="ligne.medicamentId == null"
                        class="cde-badge cde-badge--warning"
                      >
                        Non mappée
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="Demandée" width="100" align="right">
                    <template #default="{ row: ligne }">
                      <span class="cde-num">{{ ligne.quantiteDemandee ?? '—' }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="Servie" width="100" align="right">
                    <template #default="{ row: ligne }">
                      <span class="cde-num">{{ ligne.quantiteServie ?? 0 }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="Restant" width="100" align="right">
                    <template #default="{ row: ligne }">
                      <span class="cde-num">{{ (ligne.quantiteDemandee ?? 0) - (ligne.quantiteServie ?? 0) }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="Mapping" min-width="220">
                    <template #default="{ row: ligne }">
                      <div
                        v-if="ligne.medicamentId == null && ligne.id != null"
                        class="pharmacie__map-row"
                      >
                        <el-select
                          v-model="mapSelection[ligne.id]"
                          filterable
                          placeholder="Médicament..."
                          size="small"
                          style="width: 150px"
                        >
                          <el-option
                            v-for="opt in medicamentOptions"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                          />
                        </el-select>
                        <el-button
                          size="small"
                          type="primary"
                          :disabled="mapSelection[ligne.id] == null"
                          @click="onMapper(ligne)"
                        >
                          Mapper
                        </el-button>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </template>
            </el-table-column>
            <el-table-column label="Patient" min-width="160">
              <template #default="{ row }">{{ patientName(row) }}</template>
            </el-table-column>
            <el-table-column label="Document source" min-width="160">
              <template #default="{ row }">
                {{ row.document?.title ?? row.document?.id ?? row.delivrance.sourceDocumentId ?? '—' }}
              </template>
            </el-table-column>
            <el-table-column label="Statut" width="110">
              <template #default="{ row }">
                <span :class="badgeClass(DELIVRANCE_STATUT_TYPE[row.delivrance.statut as DelivranceStatut])">
                  {{ DELIVRANCE_STATUT_LABEL[row.delivrance.statut as DelivranceStatut] ?? row.delivrance.statut }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="Situation financière" min-width="210">
              <template #default="{ row }">
                <template v-if="venteOf(row)">
                  <span :class="badgeClass(statutFinancierMeta(venteOf(row)!.statutFinancier).type)">
                    {{ statutFinancierMeta(venteOf(row)!.statutFinancier).label }}
                  </span>
                  <div class="cde-muted">
                    Total {{ formatGnf(venteOf(row)!.montantTotal) }} · Payé
                    {{ formatGnf(venteOf(row)!.montantPaye) }} · Reste
                    {{ formatGnf(venteOf(row)!.reste) }}
                  </div>
                </template>
                <span v-else class="cde-muted">—</span>
              </template>
            </el-table-column>
            <el-table-column label="Créée le" width="110">
              <template #default="{ row }">
                {{ row.delivrance.createdAt ? formatDate(row.delivrance.createdAt) : '—' }}
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="270" align="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.delivrance.statut === 'a_servir' || row.delivrance.statut === 'partielle'"
                  size="small"
                  text
                  type="primary"
                  @click="servirDialog?.open(row)"
                >
                  Servir
                </el-button>
                <el-button
                  v-if="row.delivrance.statut === 'a_servir' || row.delivrance.statut === 'partielle'"
                  size="small"
                  text
                  type="danger"
                  @click="onAnnuler(row)"
                >
                  Annuler
                </el-button>
                <el-button
                  v-if="row.delivrance.statut === 'annulee'"
                  size="small"
                  text
                  type="warning"
                  @click="onRouvrir(row)"
                >
                  Rouvrir
                </el-button>
                <el-button
                  v-if="canEncaisser(row)"
                  size="small"
                  text
                  type="success"
                  @click="openEncaisser(row)"
                >
                  Encaisser
                </el-button>
                <el-button
                  v-if="row.delivrance.statut === 'servie' || row.delivrance.statut === 'partielle'"
                  size="small"
                  text
                  @click="openRecu(row)"
                >
                  Reçu
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <div class="cde-empty">Aucune délivrance dans ce statut</div>
            </template>
          </el-table>
        </div>

        <div class="cde-footer">
          <span class="cde-muted">{{ file.length }} délivrance(s)</span>
        </div>
      </el-tab-pane>

      <el-tab-pane name="alertes">
        <template #label>
          <span>Alertes</span>
          <span
            v-if="alertesCount > 0"
            class="cde-tabs__count"
          >{{ alertesCount }}</span>
        </template>

        <section class="cde-summary" aria-label="Synthèse des alertes">
          <div class="cde-summary__item">
            <span class="cde-summary__label">Ruptures</span>
            <span class="cde-summary__value cde-danger">{{ alertes.ruptures.length }}</span>
          </div>
          <div class="cde-summary__item">
            <span class="cde-summary__label">Sous seuil</span>
            <span class="cde-summary__value">{{ alertes.sousSeuil.length }}</span>
          </div>
          <div class="cde-summary__item">
            <span class="cde-summary__label">Lots périmés</span>
            <span class="cde-summary__value cde-danger">{{ alertes.perimes.length }}</span>
          </div>
          <div class="cde-summary__item">
            <span class="cde-summary__label">Péremption &lt; 3 mois</span>
            <span class="cde-summary__value">{{ alertes.peremptionProche.length }}</span>
          </div>
          <div class="cde-summary__item">
            <span class="cde-summary__label">Transferts manquants</span>
            <span class="cde-summary__value">{{ orphelines.length }}</span>
          </div>
        </section>

        <div class="cde-panels">
          <section class="cde-panel">
            <div class="cde-panel__head">
              <span class="cde-panel__title">Ruptures de stock</span>
            </div>
            <el-table
              :data="alertes.ruptures"
              size="small"
              style="width: 100%"
              aria-label="Ruptures de stock"
            >
              <el-table-column label="Article" min-width="180">
                <template #default="{ row }">{{ articleLabel(row) }}</template>
              </el-table-column>
              <el-table-column label="Stock" width="80" align="right">
                <template #default="{ row }">
                  <span class="cde-num">{{ row.stockTotal }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Seuil" width="80" align="right">
                <template #default="{ row }">
                  <span class="cde-num">{{ row.seuilAlerte }}</span>
                </template>
              </el-table-column>
              <template #empty>
                <div class="cde-empty">Aucune rupture</div>
              </template>
            </el-table>
          </section>

          <section class="cde-panel">
            <div class="cde-panel__head">
              <span class="cde-panel__title">Sous le seuil</span>
            </div>
            <el-table
              :data="alertes.sousSeuil"
              size="small"
              style="width: 100%"
              aria-label="Articles sous le seuil"
            >
              <el-table-column label="Article" min-width="180">
                <template #default="{ row }">{{ articleLabel(row) }}</template>
              </el-table-column>
              <el-table-column label="Stock" width="80" align="right">
                <template #default="{ row }">
                  <span class="cde-num">{{ row.stockTotal }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Seuil" width="80" align="right">
                <template #default="{ row }">
                  <span class="cde-num">{{ row.seuilAlerte }}</span>
                </template>
              </el-table-column>
              <template #empty>
                <div class="cde-empty">Aucun article sous le seuil</div>
              </template>
            </el-table>
          </section>

          <section class="cde-panel">
            <div class="cde-panel__head">
              <span class="cde-panel__title">Lots périmés</span>
            </div>
            <el-table
              :data="alertes.perimes"
              size="small"
              style="width: 100%"
              aria-label="Lots périmés"
            >
              <el-table-column label="Article" min-width="150">
                <template #default="{ row }">{{ row.dci }}</template>
              </el-table-column>
              <el-table-column label="N° lot" width="120">
                <template #default="{ row }">{{ row.numeroLot ?? `#${row.lotId}` }}</template>
              </el-table-column>
              <el-table-column label="Quantité" width="80" align="right">
                <template #default="{ row }">
                  <span class="cde-num">{{ row.quantite }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Péremption" width="110">
                <template #default="{ row }">{{ row.datePeremption ? formatDate(row.datePeremption) : '—' }}</template>
              </el-table-column>
              <template #empty>
                <div class="cde-empty">Aucun lot périmé</div>
              </template>
            </el-table>
          </section>

          <section class="cde-panel">
            <div class="cde-panel__head">
              <span class="cde-panel__title">Péremption proche (&lt; 3 mois)</span>
            </div>
            <el-table
              :data="alertes.peremptionProche"
              size="small"
              style="width: 100%"
              aria-label="Lots proches de la péremption"
            >
              <el-table-column label="Article" min-width="150">
                <template #default="{ row }">{{ row.dci }}</template>
              </el-table-column>
              <el-table-column label="N° lot" width="120">
                <template #default="{ row }">{{ row.numeroLot ?? `#${row.lotId}` }}</template>
              </el-table-column>
              <el-table-column label="Quantité" width="80" align="right">
                <template #default="{ row }">
                  <span class="cde-num">{{ row.quantite }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Péremption" width="110">
                <template #default="{ row }">{{ row.datePeremption ? formatDate(row.datePeremption) : '—' }}</template>
              </el-table-column>
              <template #empty>
                <div class="cde-empty">Aucun lot proche de péremption</div>
              </template>
            </el-table>
          </section>

          <section class="cde-panel">
            <div class="cde-panel__head">
              <span class="cde-panel__title">Transferts manquants (ordonnances non transférées)</span>
            </div>
            <el-table
              :data="orphelines"
              size="small"
              style="width: 100%"
              aria-label="Transferts manquants"
            >
              <el-table-column label="Document" min-width="150">
                <template #default="{ row }">{{ row.documentId }}</template>
              </el-table-column>
              <el-table-column label="Patient" min-width="150">
                <template #default="{ row }">{{ patientShortName(row.patient) }}</template>
              </el-table-column>
              <el-table-column label="Lignes" width="80" align="right">
                <template #default="{ row }">
                  <span class="cde-num">{{ row.nbLignes }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Signée le" width="110">
                <template #default="{ row }">
                  {{ row.signedAt ? formatDate(row.signedAt.slice(0, 10)) : '—' }}
                </template>
              </el-table-column>
              <template #empty>
                <div class="cde-empty">Aucun transfert manquant</div>
              </template>
            </el-table>
          </section>
        </div>
      </el-tab-pane>
    </el-tabs>

    <MedicamentFormDialog ref="medicamentDialog" @saved="onCatalogueSaved" />
    <EntreeStockDialog ref="entreeDialog" @saved="onStockSaved" />
    <StockLotAttachmentsDialog
      ref="lotAttachmentsDialog"
      @changed="onLotAttachmentsChanged"
    />
    <SortieStockDialog ref="sortieDialog" @saved="onStockSaved" />
    <AjustementStockDialog ref="ajustementDialog" @saved="onStockSaved" />
    <ServirDispensationDialog ref="servirDialog" @saved="reloadFile" />
    <EncaisserVenteDialog ref="encaisserDialog" @saved="onEncaissement" />
    <RecuServiceDialog
      ref="recuDialog"
      service="pharmacie"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Plus, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMedicaments, type MedicamentDto, TYPES_PRODUIT, TYPE_PRODUIT_LABEL } from '@/composables/useMedicaments'
import { useFournisseurs } from '@/composables/useFournisseurs'
import { useStock, type StockNiveau, type StockLotDto, type MouvementStockDto, type MouvementStockType } from '@/composables/useStock'
import { useDispensations, type DelivranceFileEntry, type DelivranceLigneDto, type DelivranceStatut } from '@/composables/useDispensations'
import { usePharmacieComptabilite, type StatutFinancierVente, type VentePharmacieDto } from '@/composables/usePharmacieComptabilite'
import { useAuth } from '@/composables/useAuth'
import { useCurrency } from '@/currency/useCurrency'
import MedicamentFormDialog from '@/components/pharmacie/MedicamentFormDialog.vue'
import EntreeStockDialog from '@/components/pharmacie/EntreeStockDialog.vue'
import StockLotAttachmentsDialog from '@/components/pharmacie/StockLotAttachmentsDialog.vue'
import CommandesTab from '@/components/pharmacie/CommandesTab.vue'
import SortieStockDialog from '@/components/pharmacie/SortieStockDialog.vue'
import AjustementStockDialog from '@/components/pharmacie/AjustementStockDialog.vue'
import ServirDispensationDialog from '@/components/pharmacie/ServirDispensationDialog.vue'
import EncaisserVenteDialog from '@/components/comptabilite/EncaisserVenteDialog.vue'
import RecuServiceDialog from '@/components/common/RecuServiceDialog.vue'

const PAGE_SIZE = 10

/** Rôles autorisés à encaisser un paiement sur une délivrance (contrôle UI). */
const ENCAISSER_ROLES: ReadonlyArray<string> = ['PHARMACIEN', 'ADMIN', 'COMPTABLE']

/** Rôles autorisés à accéder à l'espace comptabilité depuis la pharmacie. */
const COMPTABILITE_ROLES: ReadonlyArray<string> = ['ADMIN', 'COMPTABLE']

/** Rôles autorisés à gérer les bons de commande fournisseur (aligné backend). */
const PHARMACY_ORDER_ROLES: ReadonlyArray<string> = ['ADMIN', 'PHARMACIEN', 'COMPTABLE']

/** Tons visuels disponibles pour les badges CDE. */
type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'muted'

/** Classe CSS d'un badge à pastille pour un ton donné (repli neutre si inconnu). */
function badgeClass(tone: BadgeTone | string | undefined): string {
  const tones: BadgeTone[] = ['success', 'warning', 'danger', 'info', 'muted']
  const safe = tones.includes(tone as BadgeTone) ? (tone as BadgeTone) : 'muted'
  return `cde-badge cde-badge--${safe}`
}

const DELIVRANCE_STATUT_LABEL: Record<DelivranceStatut, string> = {
  a_servir: 'À servir',
  partielle: 'Partielles',
  servie: 'Servies',
  annulee: 'Annulées',
}

const DELIVRANCE_STATUT_TYPE: Record<DelivranceStatut, BadgeTone> = {
  a_servir: 'warning',
  partielle: 'info',
  servie: 'success',
  annulee: 'muted',
}

/** Libellés et tons du badge de situation financière d'une délivrance. */
const STATUT_FINANCIER_META: Record<StatutFinancierVente, { label: string; type: BadgeTone }> = {
  payee: { label: 'Payée', type: 'success' },
  partielle: { label: 'Partielle', type: 'warning' },
  credit: { label: 'Crédit', type: 'danger' },
  gratuite: { label: 'Gratuite', type: 'info' },
  sans_montant: { label: 'Sans montant', type: 'warning' },
}

const MOUVEMENT_TYPE_LABEL: Record<MouvementStockType, string> = {
  entree: 'Entrée',
  sortie_manuelle: 'Sortie manuelle',
  delivrance: 'Délivrance',
  administration: 'Administration',
  ajustement: 'Ajustement',
}

const activeTab = ref('catalogue')

const router = useRouter()
const { formatCurrency } = useCurrency()
const { user } = useAuth()
const { ventes, fetchVentes } = usePharmacieComptabilite()

const { medicaments, medicamentOptions, loading: medLoading, fetchMedicaments, deactivateMedicament, reactivateMedicament } = useMedicaments()
const { fetchFournisseurs } = useFournisseurs()
const { niveaux, alertes, loading: stockLoading, fetchNiveaux, fetchLots, fetchAlertes, mouvements, fetchMouvements } = useStock()
const { file, loading: dispLoading, error: dispError, fetchFile, createFromDocument, annulerDelivrance, mapLigne, reouvrirDelivrance, orphelines, fetchOrphelines } = useDispensations()

const medicamentDialog = ref<InstanceType<typeof MedicamentFormDialog> | null>(null)
const entreeDialog = ref<InstanceType<typeof EntreeStockDialog> | null>(null)
const lotAttachmentsDialog = ref<InstanceType<typeof StockLotAttachmentsDialog> | null>(null)
const sortieDialog = ref<InstanceType<typeof SortieStockDialog> | null>(null)
const ajustementDialog = ref<InstanceType<typeof AjustementStockDialog> | null>(null)
const servirDialog = ref<InstanceType<typeof ServirDispensationDialog> | null>(null)
const encaisserDialog = ref<InstanceType<typeof EncaisserVenteDialog> | null>(null)
const recuDialog = ref<InstanceType<typeof RecuServiceDialog> | null>(null)

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function articleLabel(n: { dci: string; nomCommercial?: string }): string {
  return n.nomCommercial ? `${n.dci} (${n.nomCommercial})` : n.dci
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function inMonthsIso(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function isPerime(datePeremption?: string): boolean {
  return !!datePeremption && datePeremption < todayIso()
}

function isNearPeremption(datePeremption?: string): boolean {
  return !!datePeremption && !isPerime(datePeremption) && datePeremption < inMonthsIso(3)
}

function lotState(lot: StockLotDto): 'danger' | 'warning' | 'info' {
  if (isPerime(lot.datePeremption)) return 'danger'
  if (isNearPeremption(lot.datePeremption)) return 'warning'
  return 'info'
}

/** Ton du badge de stock : rupture, sous seuil ou disponible. */
function stockTone(row: { stockTotal: number; seuilAlerte: number }): BadgeTone {
  if (row.stockTotal <= 0) return 'danger'
  if (row.stockTotal <= row.seuilAlerte) return 'warning'
  return 'success'
}

function patientShortName(p: { id: number; nom?: string; prenom?: string } | null, fallbackId?: number | null): string {
  if (!p) return `Patient #${fallbackId ?? '—'}`
  return `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || `Patient #${p.id}`
}

function patientName(entry: DelivranceFileEntry): string {
  return patientShortName(entry.patient, entry.delivrance.patientId)
}

/** Index des ventes financières par identifiant de délivrance. */
const ventesById = computed(() => new Map(ventes.value.map(v => [v.id, v])))

/** Vente financière associée à une délivrance (null si la vente n'existe pas encore). */
function venteOf(entry: DelivranceFileEntry): VentePharmacieDto | null {
  const id = entry.delivrance.id
  if (id == null) return null
  return ventesById.value.get(id) ?? null
}

/** Libellé et ton du badge de situation financière. */
function statutFinancierMeta(statut: StatutFinancierVente): { label: string; type: BadgeTone } {
  return STATUT_FINANCIER_META[statut] ?? { label: statut, type: 'info' }
}

/** Montant formaté (entiers GNF). */
function formatGnf(value: number | null | undefined): string {
  return formatCurrency(value ?? 0)
}

/** Rôle courant (null si non authentifié). */
function currentRole(): string | null {
  return user.value?.role ?? null
}

/** Le bouton « Encaisser » est réservé aux rôles pharmacy/comptabilité. */
function canEncaisser(entry: DelivranceFileEntry): boolean {
  const role = currentRole()
  if (!role || !ENCAISSER_ROLES.includes(role)) return false
  const statut = venteOf(entry)?.statutFinancier
  return statut === 'credit' || statut === 'partielle'
}

/** L'accès à l'espace comptabilité est réservé aux rôles ADMIN/COMPTABLE. */
const canSeeComptabilite = computed(() => {
  const role = currentRole()
  return !!role && COMPTABILITE_ROLES.includes(role)
})

/** L'onglet Commandes est réservé aux rôles pharmacie/comptabilité. */
const canSeeCommandes = computed(() => {
  const role = currentRole()
  return !!role && PHARMACY_ORDER_ROLES.includes(role)
})

/** Ouvre le dialogue d'encaissement sur une vente à crédit ou partiellement payée. */
function openEncaisser(entry: DelivranceFileEntry): void {
  const vente = venteOf(entry)
  if (!vente) return
  encaisserDialog.value?.open(vente)
}

/** Ouvre le reçu de service de la vente (lignes réellement servies). */
function openRecu(entry: DelivranceFileEntry): void {
  const id = entry.delivrance.id
  if (!id) return
  recuDialog.value?.open(id)
}

/** Redirige vers l'espace comptabilité. */
function goComptabilite(): void {
  router?.push('/app/comptabilite')
}

function typeProduitLabel(value: unknown): string {
  if (value === 'medicament' || value === 'dispositif' || value === 'consommable' || value === 'autre') {
    return TYPE_PRODUIT_LABEL[value]
  }
  return typeof value === 'string' && value ? value : '—'
}

function formatPrix(value: number | null | undefined): string {
  if (value == null) return '—'
  return Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatContenance(row: {
  contenanceQte?: number | null
  uniteContenance?: string | null
  autreUnitePrecision?: string | null
}): string {
  const qte = row.contenanceQte
  const unite = row.uniteContenance
  if (qte == null || !unite) return ''
  const base = `${qte} ${unite}`
  if (unite === 'autre' && row.autreUnitePrecision) return `${base} (${row.autreUnitePrecision})`
  return base
}

function signedQuantite(m: MouvementStockDto): number {
  const q = m.quantite ?? 0
  if (m.type === 'entree') return Math.abs(q)
  if (m.type === 'ajustement') {
    if (m.stockAvant != null && m.stockApres != null) return m.stockApres - m.stockAvant
    return q
  }
  if (m.type === 'sortie_manuelle' || m.type === 'delivrance' || m.type === 'administration') {
    return -Math.abs(q)
  }
  return q
}

function paginate<T>(list: T[], page: number, size: number): T[] {
  return list.slice((page - 1) * size, page * size)
}

function fullTextMatch(values: Array<string | number | null | undefined>, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return values.some(v => String(v ?? '').toLowerCase().includes(q))
}

const catalogueSearch = ref('')
const catalogueTypeFilter = ref<string | null>(null)
const cataloguePage_num = ref(1)
const catalogueFiltered = computed(() =>
  medicaments.value.filter(m =>
    (catalogueTypeFilter.value == null || (m.typeProduit ?? 'medicament') === catalogueTypeFilter.value) &&
    fullTextMatch([m.dci, m.nomCommercial, m.dosage, m.forme, m.conditionnement], catalogueSearch.value),
  ),
)
const cataloguePage = computed(() => paginate(catalogueFiltered.value, cataloguePage_num.value, PAGE_SIZE))
watch(catalogueSearch, () => { cataloguePage_num.value = 1 })
watch(catalogueTypeFilter, () => { cataloguePage_num.value = 1 })

function openEntree(row: StockNiveau) {
  const med = medicaments.value.find((m) => m.id === row.medicamentId)
  entreeDialog.value?.open({
    medicamentId: row.medicamentId,
    label: articleLabel(row),
    fournisseurPrincipalId: med?.fournisseurPrincipalId ?? null,
    prixAchat: med?.prixAchat ?? null,
  })
}

async function onDeactivate(med: MedicamentDto) {
  if (med.id == null) return
  try {
    await ElMessageBox.confirm(`Désactiver « ${med.dci} » du catalogue ?`, 'Confirmation', { type: 'warning', confirmButtonText: 'Désactiver', cancelButtonText: 'Annuler' })
  } catch { return }
  const ok = await deactivateMedicament(med.id)
  if (ok) ElMessage.success('Médicament désactivé')
}

async function onReactivate(med: MedicamentDto) {
  if (med.id == null) return
  const result = await reactivateMedicament(med.id)
  if (result) ElMessage.success('Médicament réactivé')
}

function onCatalogueSaved() {
  cataloguePage_num.value = 1
}

const stockSearch = ref('')
const stockPage_num = ref(1)
const stockFiltered = computed(() =>
  niveaux.value.filter(n => fullTextMatch([n.dci, n.nomCommercial], stockSearch.value)),
)
const stockPage = computed(() => paginate(stockFiltered.value, stockPage_num.value, PAGE_SIZE))
watch(stockSearch, () => { stockPage_num.value = 1 })

const lotsCache = ref<Record<number, StockLotDto[]>>({})

async function onExpandStock(row: StockNiveau, expandedRows: StockNiveau[]) {
  if (expandedRows.includes(row) && lotsCache.value[row.medicamentId] == null) {
    lotsCache.value[row.medicamentId] = await fetchLots(row.medicamentId)
  }
}

async function openAjustement(row: StockNiveau) {
  const lots = lotsCache.value[row.medicamentId] ?? await fetchLots(row.medicamentId)
  lotsCache.value[row.medicamentId] = lots
  ajustementDialog.value?.open({ medicamentId: row.medicamentId, label: articleLabel(row), lots })
}

async function reloadStock() {
  lotsCache.value = {}
  await fetchNiveaux()
  await fetchAlertes()
}

function onStockSaved() {
  lotsCache.value = {}
}

/**
 * Ouvre la gestion des pièces jointes d'un lot.
 *
 * @param lot - Lot sélectionné.
 */
function openLotAttachments(lot: StockLotDto) {
  if (lot.id == null) return
  lotAttachmentsDialog.value?.open({
    id: lot.id,
    numeroLot: lot.numeroLot,
    refBl: lot.refBl,
  })
}

/**
 * Met à jour le compteur de pièces jointes dans le cache des lots.
 *
 * @param lotId - Lot modifié.
 * @param count - Nouveau nombre de pièces jointes.
 */
function onLotAttachmentsChanged(lotId: number, count: number) {
  for (const lots of Object.values(lotsCache.value)) {
    const target = lots.find((lot) => lot.id === lotId)
    if (target) target.attachmentsCount = count
  }
}

const mouvementArticle = ref<number | null>(null)
const mouvementType = ref<MouvementStockType | null>(null)

async function reloadMouvements() {
  await fetchMouvements({
    medicamentId: mouvementArticle.value ?? undefined,
    type: mouvementType.value ?? undefined,
  })
}

watch([mouvementArticle, mouvementType], reloadMouvements)

const delivranceStatut = ref<DelivranceStatut>('a_servir')
const manualDocId = ref('')
const mapSelection = ref<Record<number, number | null>>({})

async function onMapper(ligne: DelivranceLigneDto) {
  if (ligne.id == null) return
  const medicamentId = mapSelection.value[ligne.id]
  if (medicamentId == null) return
  const mapped = await mapLigne(ligne.id, medicamentId)
  if (mapped) {
    delete mapSelection.value[ligne.id]
    ElMessage.success('Ligne mappée au catalogue')
  }
}

async function reloadFile() {
  await fetchFile(delivranceStatut.value)
  await fetchVentes()
}

async function onAnnuler(entry: DelivranceFileEntry) {
  const id = entry.delivrance.id
  if (id == null) return
  let motif = ''
  try {
    const { value } = await ElMessageBox.prompt('Motif de l’annulation (obligatoire)', 'Annuler la délivrance', {
      confirmButtonText: 'Annuler la délivrance',
      cancelButtonText: 'Retour',
      inputPlaceholder: 'Motif...',
    })
    motif = String(value ?? '').trim()
  } catch { return }
  if (!motif) {
    ElMessage.warning('Le motif est requis')
    return
  }
  const ok = await annulerDelivrance(id, motif)
  if (ok) ElMessage.success('Délivrance annulée')
}

async function onRouvrir(entry: DelivranceFileEntry) {
  const id = entry.delivrance.id
  if (id == null) return
  let motif = ''
  try {
    const { value } = await ElMessageBox.prompt('Motif de la réouverture (obligatoire)', 'Rouvrir la demande', {
      confirmButtonText: 'Rouvrir',
      cancelButtonText: 'Retour',
      inputPlaceholder: 'Motif...',
    })
    motif = String(value ?? '').trim()
  } catch { return }
  if (!motif) {
    ElMessage.warning('Le motif est requis')
    return
  }
  const reopened = await reouvrirDelivrance(id, motif)
  if (reopened) ElMessage.success('Demande rouverte')
}

/** Rafraîchit la liste des délivrances et leurs situations financières après encaissement. */
async function onEncaissement(): Promise<void> {
  await reloadFile()
}

async function onManualTransfer() {
  const docId = manualDocId.value.trim()
  if (!docId) return
  try {
    const result = await createFromDocument(docId)
    if (!result) {
      if (!dispError.value) ElMessage.warning('Aucune ligne médicament à transférer pour ce document')
      return
    }
    const created = result.created
    if (created === false) ElMessage.info('Déjà transférée à la pharmacie')
    else ElMessage.success('Ordonnance transférée à la pharmacie')
    manualDocId.value = ''
    await reloadFile()
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

const alertesCount = computed(() =>
  alertes.value.ruptures.length + alertes.value.sousSeuil.length +
  alertes.value.perimes.length + alertes.value.peremptionProche.length + orphelines.value.length,
)

async function onTabClick() {
  if (activeTab.value === 'alertes') {
    await fetchAlertes()
    await fetchOrphelines()
  }
  if (activeTab.value === 'delivrances') await reloadFile()
  if (activeTab.value === 'mouvements') await reloadMouvements()
}

onMounted(async () => {
  await fetchMedicaments()
  fetchFournisseurs().catch(() => undefined)
  await fetchNiveaux()
  await fetchAlertes()
  await fetchOrphelines()
  await fetchMouvements()
  await reloadFile()
})
</script>

<style scoped>
.pharmacie__neg {
  color: var(--cd-alert-red);
  font-weight: 600;
}

.pharmacie__pos {
  color: var(--cd-success);
  font-weight: 600;
}

.pharmacie__map-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  max-width: 100%;
}
</style>
