const Documents = Vue.resource(
  '/colligator/api/documents{/id}',
  null,
  {
    saveCover: {method: 'POST', url: '/colligator/api/documents{/id}/cover'},
    saveDescription: {method: 'POST', url: '/colligator/api/documents{/id}/description'},
    cannotFindCover: {method: 'POST', url: '/colligator/api/documents{/id}/cannotFindCover'}
  },
  {
    before: function (request) {
      if (Documents.previousRequest && Documents.previousRequest.method == 'GET') {
        Documents.previousRequest.abort()
      }
      Documents.previousRequest = request;
    }
  }
)

// Since this is a simple app, we use a global state object rather than Vuex
const GlobalState = new Vue({
  data: () => ({
    canEdit: false,
  })
})


// ---------------------------------------------------------------------------
// EditableCover.vue
// import Documents from 'Documents.vue'
// import GlobalState from 'GlobalState.vue'

const EditableCover = {
  template: `
    <div>
      <div v-if="canEdit">
        <div v-if="!editMode">
          Omslagsbilde:
          <span v-if="doc.cover && doc.cover.cached">
            <a v-if="doc.cover.url" :href="doc.cover.url" target="_blank">{{ doc.cover.url.length > 40 ? doc.cover.url.substr(0,40) + '…' : doc.cover.url }}</a>
            <button v-on:click="edit" class="btn btn-secondary btn-sm">Rediger omslagsbilde</button>
          </span>
          <span v-else>
            <button v-on:click="edit" class="btn btn-outline-success btn-sm"> <i class="fa fa-heart" aria-hidden="true"></i> Legg til</button>
          </span>
          <span v-if="!doc.cover || !doc.cover.cached">
            <button v-on:click="notFound" class="btn btn-outline-danger btn-sm"> <i class="fa fa-times" aria-hidden="true"></i> Jeg gir opp</button>
            <span v-if="doc.cannot_find_cover">
              {{ doc.cannot_find_cover }} person(er) ga opp å prøve å finne omslagsbilde.
            </span>
          </span>
        </div>
        <form v-else v-on:submit.prevent="submit" class="form-inline">
          <label :for="'coverUrl' + doc.id" class="mr-2">Omslagsbilde:</label>
          <input type="text"
            :id="'coverUrl' + doc.id"
            class="col form-control form-control-sm mr-2"
            v-model="url" placeholder="URL til omslagsbilde">
          <div>
            <span v-if="busy">
              Lagrer…
            </span>
            <span v-else>
              <button type="button" class="btn btn-secondary btn-sm" v-on:click="cancel">Avbryt</button>
              <button type="submit" class="btn btn-primary btn-sm">Lagre</button>
            </span>
          </div>
          <div class="alert alert-danger" role="alert" v-if="errors && errors.length">
            <div v-for="error in errors">{{ error }}</div>
          </div>
        </form>
      </div>
      <div v-else style="color:rgb(185, 185, 185); font-size:80%">
        <em class="glyphicon glyphicon-lock"></em>
        Du må være på UiO-nett for å redigere
      </div>
    </div>
  `,
  props: {
    doc: Object
  },
  computed: {
    canEdit: () => GlobalState.canEdit,
  },
  data: () => ({
    url: '',
    busy: false,
    errors: [],
    editMode: false
  }),
  created: function () {
    this.url = this.doc.cover ? this.doc.cover.url : ''
  },
  methods: {
    edit: function () {
      this.editMode = true

      // Allow Vue to update the DOM before we focus
      setTimeout(() => document.getElementById('coverUrl' + this.doc.id).focus())
    },
    cancel: function () {
      this.editMode = false
      this.url = this.doc.cover ? this.doc.cover.url : ''
    },
    failed: function (response) {
      // error callback
      console.log(response)
      if (response.status === 401) {
        this.errors = ['Ingen tilgang: ' + response.body]
      } else {
        this.errors = ['Save failed because of network or server issues.']
      }
      if (response.status === 422) {
        this.errors = Object.keys(response.body).map(k => response.body[k][0])
        console.log(this.errors)
      }
      this.busy = false
    },
    notFound: function () {
       if (this.busy) {
        return
      }
      this.busy = true
      this.errors = []
      Documents.cannotFindCover({id: this.doc.id}, {}).then((response) => {
        this.busy = false
        if (response.body.result !== 'ok') {
          this.errors = [response.body.error]
          return
        }
        this.doc.cannot_find_cover = response.body.cannot_find_cover;
      }, this.failed.bind(this))
    },
    submit: function () {
      if (this.busy) {
        return
      }
      this.busy = true
      this.errors = []
      Documents.saveCover({id: this.doc.id}, {url: this.url}).then((response) => {
        this.busy = false
        if (response.body.result !== 'ok') {
          this.errors = [response.body.error]
          return
        }
        this.doc.cover = response.body.cover
        this.editMode = false
      }, this.failed.bind(this))
    }
  }
}


// ---------------------------------------------------------------------------
// EditableDescription.vue
// import Documents from 'Documents.vue'
// import GlobalState from 'GlobalState.vue'

const EditableDescription = {
  template: `
    <div>
      <div v-if="canEdit">
        <div v-if="!editMode">
          <div v-if="doc.description && doc.description.text">
            <button style="float:right" v-on:click="edit" class="btn btn-secondary btn-sm">Rediger beskrivelse</button>
            <div style="font-style:italic; font-size:90%;" v-html="htmlText"></div>
            <p style="font-size:70%; color:#888;">Kilde: {{ doc.description.source_url }}</p>
          </div>
          <span v-else>
            <button v-on:click="edit" class="mt-2 mb-2 btn btn-outline-success btn-sm"> <i class="fa fa-heart" aria-hidden="true"></i> Legg til beskrivelse</button>
          </span>
        </div>
        <form v-else v-on:submit.prevent="submit" class="mt-2">
          <div class="form-group">
            <label :for="'descriptionText' + doc.id">Beskrivelse:</label>
          <textarea :id="'descriptionText' + doc.id"
            class="form-control form-control-sm"
            v-model="text" rows="8"></textarea>
        </div>
        <div class="form-group">
            <label :for="'descriptionSourceUrl' + doc.id">Kilde:</label>
            <input type="text" :id="'descriptionSourceUrl' + doc.id"
              placeholder="URL til nettsiden du hentet beskrivelsen fra"
              class="form-control form-control-sm col"
              v-model="sourceUrl">
              </div>
          <span v-if="busy">
            Lagrer…
          </span>
          <span v-else>
            <button type="button" class="btn btn-secondary btn-sm" v-on:click="cancel">Avbryt</button>
            <button type="submit" class="btn btn-primary btn-sm">Lagre</button>
          </span>
          <div class="alert alert-danger" role="alert" v-if="errors && errors.length">
            <div v-for="error in errors">{{ error }}</div>
          </div>
        </form>
      </div>
    </div>
  `,
  props: {
    doc: Object
  },
  computed: {
    canEdit: () => GlobalState.canEdit,
    htmlText: function() {
      return this.text.replace(/\n/g, '<br>');
    }
  },
  data: () => ({
    text: '',
    sourceUrl: '',
    busy: false,
    errors: [],
    editMode: false
  }),
  created: function () {
    this.text = this.doc.description ? this.doc.description.text : ''
    this.sourceUrl = this.doc.description ? this.doc.description.source_url : ''
  },
  methods: {
    edit: function () {
      this.editMode = true

      // Wait for Vue to update the DOM before we focus
      setTimeout(() => document.getElementById('descriptionText' + this.doc.id).focus())
    },
    cancel: function () {
      this.editMode = false
      this.text = this.doc.description ? this.doc.description.text : ''
      this.sourceUrl = this.doc.description ? this.doc.description.source_url : ''
    },
    failed: function (response) {
      // error callback
      console.log(response)
      if (response.status === 401) {
        this.errors = ['Ingen tilgang: ' + response.body]
      } else {
        this.errors = ['Save failed because of network or server issues.']
      }
      if (response.status === 422) {
        this.errors = Object.keys(response.body).map(k => response.body[k][0])
        console.log(this.errors)
      }
      this.busy = false
    },
    submit: function () {
      if (this.busy) {
        return
      }
      this.busy = true
      this.errors = []
      Documents.saveDescription({id: this.doc.id}, {text: this.text, source: 'editor', source_url: this.sourceUrl}).then((response) => {
        this.busy = false
        if (response.body.result !== 'ok') {
          this.errors = [response.body.error]
          return
        }
        this.doc.description = response.body.description
        this.editMode = false
      }, this.failed.bind(this))
    }
  }
}

// ---------------------------------------------------------------------------
// Document.vue
// import EditableCover from 'EditableCover.vue'

const Document = {
  template: `
    <li class="list-group-item">
      <div style="width:100%">
        <img v-if="doc.cover" :src="doc.cover.thumb.url" style="width: 100px;" />
        <div style="flex: 1 1 auto;">
          <h3>
            {{ doc.title }} <span style="color:#018D83">({{doc.year}})</span>
           <small>
           (<a :href="'https://www.google.no/search?q=' + encodeURIComponent(doc.title)" target="google">Web-søk</a>
            / <a :href="'https://www.google.no/search?tbm=isch&q=' + encodeURIComponent(doc.title)" target="google">Bilde-søk</a>)</small>
           </h3>
          <span style="background: #eee; border-radius:3px; padding:0 6px; margin-right:5px; font-size:85%; display:inline-block;" v-for="creator in doc.creators"> {{creator.normalizedName}} </span>

          <editable-description :doc="doc"></editable-description>
          <div class="mb-2" style="font-size:85%; color: #008">
            Utgiver: {{doc.publisher}}<br>
            ISBN: <span v-for="isbn in doc.isbns">
            {{ isbn }} 
            (<a :href="'https://www.google.no/search?q=' + isbn.replace(/-/g, '')" target="google">Web-søk</a>
            / <a :href="'https://www.google.no/search?tbm=isch&q=' + isbn.replace(/-/g, '')" target="google">Bilde-søk</a>)
             </span>
            <div v-for="holding in localHoldings">
              {{ holding.barcode }} :
              {{ holding.callcode ? holding.callcode : '(ikke stilt opp på hylla enda)' }}
            </div>
          </div>
          <editable-cover :doc="doc"></editable-cover>
        </div>
      </div>
    </li>
  `,
  props: {
    doc: Object
  },
  computed: {
    localHoldings: function () {
      return this.doc.holdings ? this.doc.holdings.filter(holding => holding.shelvinglocation === 'k00475') : []
    }
  },
  components: {
    'editable-cover': EditableCover,
    'editable-description': EditableDescription,
  }
}

// ---------------------------------------------------------------------------
// Search.vue
// import GlobalState from 'GlobalState.vue'

const Search = {
  template: `
    <div>
      <div>
        Søk med <a target="_blank" href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html">ElasticSearch query string syntax</a>:
      </div>
      <form v-on:submit.prevent="submitForm" class="form-inline no-gutters">
        <div class="col-md-6">
          <input v-model="query" class="form-control" style="width:100%;">
        </div>
        <div class="col-sm-6">
          Sortering:
          <select v-model="sort" class="form-control">
            <option value="">(ingen sortering)</option>
            <option value="year">utgivelsesår</option>
            <option value="holdings.callcodeSortable">hyllesignatur</option>
            <option value="cover.created">dato for omslagsbilde</option>
            <option value="created">dato for postopprettelse</option>
          </select>
          <select v-model="order" class="form-control">
            <option value="asc">stigende</option>
            <option value="desc">synkende</option>
          </select>
          <button type="submit" class="btn btn-primary">Søk</button>
        </div>
      </form>
      <p>
        Du kan f.eks. søke etter
        <router-link :to="{ path: '/search', query: { q: 'collections:&quot;samling42&quot; AND NOT _exists_:cover AND cannot_find_cover:0', sort: 'year', 'order': 'desc' }}">
          dokumenter i 42-samlingen som mangler omslagsbilde
        </router-link>
        eller
        <router-link :to="{ path: '/search', query: { q: 'cover.created:' + today, sort: 'cover.created', order: 'desc' }}">
          dokumenter som har fått omslagsbilde i dag
        </router-link>
      </p>
      <router-view></router-view>
    </div>
  `,
  created: function () {
    console.log('Hello, Search created')
    this.getQueryString()
    this.checkIp()
  },
  watch: {
    // call again the method if the route changes
    '$route': function() {
      this.getQueryString()
    }
  },
  data: () => ({
    query: '',
    sort: 'year',
    order: 'desc',
    today: (new Date()).toISOString().substr(0,10),
  }),
  methods: {
    submitForm: function () {
      this.$router.push({ path: '/search', query: {
        q: this.query,
        sort: (this.sort == '') ? null : this.sort,
        order: (this.sort == '') ? null : this.order,
      }})
    },
    getQueryString: function () {
      this.query = this.$route.query.q
      this.sort = this.$route.query.sort || 'year';
      this.order = this.$route.query.order || 'desc';
    },
    checkIp: function () {
      this.$http.get('/colligator/api/ipcheck').then((response) => {
        GlobalState.canEdit = true;
      }, (response) => {
        GlobalState.canEdit = false;
      });
    },
  }
}

// ---------------------------------------------------------------------------
// SearchResults.vue
// import Document from 'Document.vue'
// import Documents from 'Documents.vue'

const SearchResults = {
  template: `
    <div>
      <div v-show="!busy && !error">Got {{ documents.length }} of {{ totalResults }} results</div>
      <div v-show="error" class="alert alert-danger">{{ error }}</div>
      <ul class="list-group">
        <document :doc="doc" v-for="doc in documents" :key="doc.id"></document>
      </ul>
      <div v-show="busy">Henter...</div>
      <p class="mt-2">
        <button v-on:click="more()" v-show="!busy && documents.length < totalResults" class="btn btn btn-outline-info">Hent flere</button>
      </p>
    </div>
  `,
  created: function () {
    console.log('Hello, SearchResults created')
    this.fetchResults()
  },
  watch: {
    // call again the method if the route changes
    '$route': function() {
      this.fetchResults()
    }
  },
  components: {
    'document': Document
  },
  data: function () {
    return {
      documents: [],
      from: 0,
      totalResults: 0,
      busy: true,
      error: ''
    }
  },
  methods: {
    more: function() {
      this.fetchResults(this.from)
    },
    fetchResults: function (from) {
      if (!from) {
        from = 0
        this.documents = []
      }
      this.busy = true
      console.log('Searching for: ' + this.$route.query.q)

      this.error = ''
      Documents.get({
        q: this.$route.query.q,
        offset: from,
        sort: this.$route.query.sort,
        order: this.$route.query.order,
      }).then((response) => {
        this.error = ''
        if (typeof response.body != 'object') {
          this.error = 'Server returned non-JSON response'
          this.busy = false
          return
        }
        if (response.body.error) {
          this.error = response.body.error + ':' + response.body.error_message;
          this.busy = false
          return
        }
        response.body.documents.forEach((doc) => {
          if (!doc.cannot_find_cover) {
            // Initialize with default value since Vue cannot detect property addition or deletion
            // https://vuejs.org/v2/guide/reactivity.html
            doc.cannot_find_cover = 0;
          }
          if (doc.description && doc.description.text) {
            doc.description.text = doc.description.text.replace(/Ã¦/g, 'æ')
            doc.description.text = doc.description.text.replace(/Ã¥/g, 'å')
            doc.description.text = doc.description.text.replace(/Ã¸/g, 'ø')
          }
          this.documents.push(doc)
          this.from++
        })
        this.totalResults = response.body.total
        this.busy = false
      }, (response) => {
        // error callback
        console.log(response)
        this.error = 'Beklager, det oppsto en feil'
        this.busy = false
      })
    }
  }
}

// ---------------------------------------------------------------------------

// main.js
// import Vue from 'vue'
// import VueRouter from 'vue-router'
// import Search from 'Search.vue'
// import SearchResults from 'SearchResults.vue'

const router = new VueRouter({
  routes: [
    {
      path: '/',
      component: Search,
      children: [
        {
          path: 'search',
          component: SearchResults
        }
      ]
    }
  ]
})

// mount a root Vue instance
new Vue({router}).$mount('#app')
