const Documents = Vue.resource(
  '/colligator/api/documents{/id}',
  null,
  {
    saveCover: {method: 'POST', url: '/colligator/api/documents{/id}/cover'},
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
          <span v-if="doc.cover && doc.cover.url">
            <a :href="doc.cover.url" target="_blank">{{ doc.cover.url.length > 80 ? doc.cover.url.substr(0,80) + '…' : doc.cover.url }}</a>
            <button v-on:click="edit" class="btn btn-default btn-xs">Rediger</button>
          </span>
          <span v-else>
            <button v-on:click="edit" class="btn btn-success btn-xs"> <em class="glyphicon glyphicon-heart"></em> Legg til</button>
          </span>
          <span v-if="!doc.cover || !doc.cover.url">
            <button v-on:click="notFound" class="btn btn-warning btn-xs"> <em class="glyphicon glyphicon-ban-circle"></em> Jeg gir opp</button>
            <span v-if="doc.cannot_find_cover">
              {{ doc.cannot_find_cover }} person(er) ga opp å prøve å finne omslagsbilde.
            </span>
          </span>
        </div>
        <form v-else v-on:submit.prevent="submit" class="form-inline">
          <div class="form-group">
            <label :for="'coverUrl' + doc.id">Cover:</label>
            <input type="text" :id="'coverUrl' + doc.id" class="form-control input-sm" style="width:600px" v-model="url">
          </div>
          <span v-if="busy">
            Hold on…
          </span>
          <span v-else>
            <button type="button" class="btn btn-default btn-sm" v-on:click="cancel">Avbryt</button>
            <button type="submit" class="btn btn-primary btn-sm">Lagre</button>
          </span>
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
// Document.vue
// import EditableCover from 'EditableCover.vue'

const Document = {
  template: `
    <li class="list-group-item">
      <div>
        <img v-if="doc.cover" :src="doc.cover.thumb.url" style="width: 100px;" />
        <div>
          <h3>{{ doc.title }} <span style="color:#018D83">({{doc.year}})</span></h3>
          <p v-if="doc.description">{{ doc.description }}</p>
          ISBN: <span v-for="isbn in doc.isbns"> {{ isbn }} </span>
          <div v-for="holding in localHoldings">
            {{ holding.barcode }} :
            {{ holding.callcode }}
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
      return this.doc.holdings.filter(holding => holding.shelvinglocation === 'k00475')
    }
  },
  components: {
    'editable-cover': EditableCover
  }
}

// ---------------------------------------------------------------------------
// Search.vue
// import GlobalState from 'GlobalState.vue'

const Search = {
  template: `
    <div>
      <form v-on:submit.prevent="submitForm" class="form-inline">
        Søk med <a target="_blank" href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html">ElasticSearch query string syntax</a>:
        <div class="row">
          <div class="col-md-10">
            <input v-model="query" class="form-control" style="width:100%">
          </div>
          <div class="col-md-2">
            <button type="submit" class="btn btn-primary" style="width:100%">Search</button>
          </div>
        </div>
        <p style="margin-top:.4em">
          Du kan f.eks. søke etter
          <router-link :to="{ path: '/search', query: { q: 'collections:&quot;samling42&quot; AND _missing_:cover AND cannot_find_cover:0' }}">
            dokumenter i 42-samlingen som mangler omslagsbilde
          </router-link>
          eller
          <router-link :to="{ path: '/search', query: { q: 'cover.created:&quot;' + today + '&quot;' }}">
            dokumenter som har fått omslagsbilde i dag
          </router-link>
        </p>
      </form>
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
    today: (new Date()).toISOString().substr(0,10),
  }),
  methods: {
    submitForm: function () {
      this.$router.push({ path: '/search', query: { q: this.query } })
    },
    getQueryString: function () {
      this.query = this.$route.query.q
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
      <button v-on:click="more()" v-show="!busy && documents.length < totalResults" class="btn btn-default">Hent flere</button>
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
      Documents.get({q: this.$route.query.q, offset: from}).then((response) => {
        this.error = ''
        if (typeof response.body != 'object') {
          this.error = 'Server returned non-JSON response'
          this.busy = false
          return
        }
        response.body.documents.forEach((doc) => {
          if (!doc.cannot_find_cover) {
            // Initialize with default value since Vue cannot detect property addition or deletion
            // https://vuejs.org/v2/guide/reactivity.html
            doc.cannot_find_cover = 0;
          }
          this.documents.push(doc)
          this.from++
        })
        this.totalResults = response.body.total
        this.busy = false
      }, (response) => {
        // error callback
        console.log(response)
        this.error = 'Sorry, an error occured'
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
